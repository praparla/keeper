/**
 * The nightly sweep (§11, §13). Loads engine inputs from the DB, calls the pure
 * `evaluate()`, and persists suggestions + expirations in one transaction. Refill-task
 * generation (§6.4) rides the same sweep. Records a JobRun row for observability.
 */
import { prisma } from "@/lib/db";
import { SuggestionStatus, type Prisma } from "@prisma/client";
import { evaluate } from "@/lib/engine";
import type { EngineTemplate, EngineRecipient, CircleState, TemplateGates } from "@/lib/engine/types";
import { isClimateRegion, type ClimateRegion } from "@/lib/climate";
import { isFactValue, type FactValue } from "@/lib/facts";
import { sweepRefills } from "@/lib/refills";

/** Parse a stored requiresFacts JSON blob into engine gates + the circle-level flag. */
function parseGates(raw: Prisma.JsonValue | null): { gates: TemplateGates; recipientAgnostic: boolean } {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { gates: {}, recipientAgnostic: false };
  }
  const o = raw as Record<string, unknown>;
  return {
    recipientAgnostic: o.circleLevel === true,
    gates: {
      facts: (o.facts as Record<string, boolean>) ?? undefined,
      residence: (o.residence as TemplateGates["residence"]) ?? undefined,
      regions: (o.regions as ClimateRegion[]) ?? undefined,
      minActiveMeds: typeof o.minActiveMeds === "number" ? o.minActiveMeds : undefined,
    },
  };
}

async function loadTemplates(): Promise<EngineTemplate[]> {
  const rows = await prisma.suggestionTemplate.findMany({ where: { active: true } });
  return rows.map((r) => {
    const { gates, recipientAgnostic } = parseGates(r.requiresFacts);
    return {
      id: r.id, slug: r.slug, title: r.title, reasonTemplate: r.reasonTemplate,
      category: r.category, triggerType: r.triggerType,
      windowStartMonth: r.windowStartMonth, windowStartDay: r.windowStartDay,
      windowEndMonth: r.windowEndMonth, windowEndDay: r.windowEndDay,
      intervalDays: r.intervalDays, intervalAnchor: r.intervalAnchor,
      leadDays: r.leadDays, minAge: r.minAge, gates, climateSensitive: r.climateSensitive,
      defaultTaskType: r.defaultTaskType, defaultRecurrence: r.defaultRecurrence,
      active: r.active, recipientAgnostic,
    };
  });
}

/** Most recent completion (Resolved task) per template lineage, keyed by templateSlug. */
function completionMap(tasks: { templateSlug: string | null; updatedAt: Date }[]): Record<string, Date> {
  const out: Record<string, Date> = {};
  for (const t of tasks) {
    if (!t.templateSlug) continue;
    if (!out[t.templateSlug] || t.updatedAt > out[t.templateSlug]) out[t.templateSlug] = t.updatedAt;
  }
  return out;
}

async function loadCircleInputs(circleId: string) {
  const [recipients, existing, resolvedTasks] = await Promise.all([
    prisma.careRecipient.findMany({
      where: { circleId },
      include: {
        facts: true,
        suppressions: true,
        _count: { select: { medications: { where: { active: true } } } },
      },
    }),
    prisma.suggestion.findMany({
      where: { circleId, status: { in: [SuggestionStatus.PENDING, SuggestionStatus.SNOOZED] } },
      select: { id: true, templateId: true, cycleKey: true, status: true, windowEnd: true },
    }),
    prisma.task.findMany({
      where: { circleId, status: "Resolved", templateSlug: { not: null } },
      select: { templateSlug: true, updatedAt: true, recipientId: true },
    }),
  ]);

  const engineRecipients: EngineRecipient[] = recipients.map((r) => {
    const facts: Record<string, FactValue> = {};
    for (const f of r.facts) if (isFactValue(f.value)) facts[f.key] = f.value;
    return {
      id: r.id, name: r.name, relationship: r.relationship, birthYear: r.birthYear,
      timezone: r.timezone,
      climateRegion: r.climateRegion && isClimateRegion(r.climateRegion) ? r.climateRegion : null,
      residenceType: r.residenceType, createdAt: r.createdAt, facts,
      activeMedCount: r._count.medications,
      suppressedSlugs: new Set(r.suppressions.map((s) => s.templateSlug)),
      lastCompletionByTemplate: completionMap(resolvedTasks.filter((t) => t.recipientId === r.id)),
    };
  });

  const circle: CircleState = {
    circleId,
    timezone: engineRecipients[0]?.timezone ?? "America/New_York",
    existing,
    lastCompletionByTemplate: completionMap(resolvedTasks.filter((t) => t.recipientId === null)),
  };

  return { engineRecipients, circle };
}

export interface SweepCounts {
  created: number;
  expired: number;
  refills: number;
}

/** Sweep a single circle. Returns what changed. Idempotent given `now`. */
export async function sweepCircle(circleId: string, now: Date = new Date()): Promise<SweepCounts> {
  const [templates, { engineRecipients, circle }] = await Promise.all([
    loadTemplates(),
    loadCircleInputs(circleId),
  ]);

  const { create, expire } = evaluate(templates, engineRecipients, circle, now);

  await prisma.$transaction([
    ...create.map((s) =>
      prisma.suggestion.create({
        data: {
          circleId: s.circleId, recipientId: s.recipientId, templateId: s.templateId,
          cycleKey: s.cycleKey, title: s.title, reason: s.reason,
          windowStart: s.windowStart, windowEnd: s.windowEnd, status: SuggestionStatus.PENDING,
        },
      }),
    ),
    ...(expire.length
      ? [prisma.suggestion.updateMany({ where: { id: { in: expire } }, data: { status: SuggestionStatus.EXPIRED } })]
      : []),
  ]);

  const refills = await sweepRefills(circleId, now);
  return { created: create.length, expired: expire.length, refills };
}

/** Sweep every circle (the nightly cron entry point). Records one JobRun. */
export async function sweepAll(now: Date = new Date()): Promise<SweepCounts> {
  const run = await prisma.jobRun.create({ data: { job: "suggestion-sweep" } });
  const totals: SweepCounts = { created: 0, expired: 0, refills: 0 };
  try {
    const circles = await prisma.careCircle.findMany({ select: { id: true } });
    for (const c of circles) {
      const counts = await sweepCircle(c.id, now);
      totals.created += counts.created;
      totals.expired += counts.expired;
      totals.refills += counts.refills;
    }
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: true, counts: { ...totals } as Prisma.InputJsonObject },
    });
    return totals;
  } catch (error) {
    await prisma.jobRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: false, error: error instanceof Error ? error.message : String(error) },
    });
    throw error;
  }
}
