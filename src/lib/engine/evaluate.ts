/**
 * The suggestion engine (§11) — a pure function. No I/O: the jobs service loads
 * inputs, calls evaluate(), and persists outputs in one transaction. Deterministic
 * given `now`. See docs/keeper-v2-spec.md §11.2 for the per-template×recipient algorithm.
 */
import { TriggerType, IntervalAnchor } from "@prisma/client";
import { getFact, type FactValue } from "@/lib/facts";
import { frostPhrase } from "@/lib/climate";
import type {
  EngineTemplate, EngineRecipient, CircleState, EvaluateResult, NewSuggestion,
} from "./types";
import {
  localDayIndex, localDateOf, dayIndex, resolveWindow, ageFromBirthYear, dateAtLocalMidnight,
} from "./dates";

const MS_PER_DAY = 86_400_000;
const dateFromIdx = (idx: number) => new Date(idx * MS_PER_DAY);

/** Resolve a gated fact to a boolean, or "skip" when an unknown must not be guessed. */
function resolveFact(value: FactValue | undefined, key: string): boolean | "skip" {
  if (value === "true") return true;
  if (value === "false") return false;
  // undefined or "unknown" → per the registry's unknown-gate semantics.
  return (getFact(key)?.unknownGate ?? "skip") === "false" ? false : "skip";
}

/** All gates for a recipient-scoped template (§11.2 step 1). Silent skip on any failure. */
function passesGates(t: EngineTemplate, r: EngineRecipient, nowYear: number): boolean {
  if (r.suppressedSlugs.has(t.slug)) return false;

  if (t.minAge != null) {
    const age = ageFromBirthYear(r.birthYear, nowYear);
    if (age == null || age < t.minAge) return false; // unknown age ⇒ skip age-gated
  }
  if (t.gates.residence && (!r.residenceType || !t.gates.residence.includes(r.residenceType))) return false;
  if (t.gates.regions && (!r.climateRegion || !t.gates.regions.includes(r.climateRegion))) return false;
  if (t.gates.minActiveMeds != null && r.activeMedCount < t.gates.minActiveMeds) return false;

  if (t.gates.facts) {
    for (const [key, required] of Object.entries(t.gates.facts)) {
      const resolved = resolveFact(r.facts[key], key);
      if (resolved === "skip" || resolved !== required) return false;
    }
  }
  return true;
}

function formatWindow(windowStart: Date, windowEnd: Date | null): string {
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
  return windowEnd ? `${fmt(windowStart)} – ${fmt(windowEnd)}` : fmt(windowStart);
}

function renderReason(
  t: EngineTemplate,
  ctx: { name: string; age: number | null; region: EngineRecipient["climateRegion"]; windowStart: Date; windowEnd: Date | null },
): string {
  return t.reasonTemplate
    .replaceAll("{name}", ctx.name)
    .replaceAll("{age}", ctx.age != null ? String(ctx.age) : "their age")
    .replaceAll("{window}", formatWindow(ctx.windowStart, ctx.windowEnd))
    .replaceAll("{frostDate}", frostPhrase(ctx.region));
}

interface FireContext {
  cycleKey: string;
  windowStart: Date;
  windowEnd: Date | null;
}

/** Compute the active cycle + window for a template against one subject, or null (no fire). */
function computeFire(
  t: EngineTemplate,
  scope: string,
  tz: string,
  now: Date,
  createdAt: Date | null,
  lastCompletion: Date | undefined,
): FireContext | null {
  const nowIdx = localDayIndex(now, tz);
  const nowYear = localDateOf(now, tz).year;

  switch (t.triggerType) {
    case TriggerType.SEASONAL_WINDOW:
    case TriggerType.FIXED_DATE: {
      if (t.windowStartMonth == null || t.windowStartDay == null || t.windowEndMonth == null || t.windowEndDay == null) return null;
      const win = resolveWindow(nowIdx, nowYear, t.windowStartMonth, t.windowStartDay, t.windowEndMonth, t.windowEndDay, t.leadDays);
      if (!win) return null;
      return { cycleKey: `${scope}:${win.startYear}-${t.slug}`, windowStart: win.windowStart, windowEnd: win.windowEnd };
    }
    case TriggerType.INTERVAL: {
      if (!t.intervalDays) return null;
      if (lastCompletion) {
        const l = localDateOf(lastCompletion, tz);
        const nextDueIdx = dayIndex(l.year, l.month, l.day) + t.intervalDays;
        if (nowIdx < nextDueIdx - t.leadDays) return null;
        return { cycleKey: `${scope}:${t.slug}:${nextDueIdx}`, windowStart: dateFromIdx(nextDueIdx), windowEnd: null };
      }
      // No completion on record.
      if (t.intervalAnchor === IntervalAnchor.ASSUME_DUE) {
        return { cycleKey: `${scope}:${t.slug}:init`, windowStart: dateFromIdx(nowIdx), windowEnd: null };
      }
      // START_FRESH: wait one interval from the subject's creation.
      if (!createdAt) return null;
      const c = localDateOf(createdAt, tz);
      const nextDueIdx = dayIndex(c.year, c.month, c.day) + t.intervalDays;
      if (nowIdx < nextDueIdx - t.leadDays) return null;
      return { cycleKey: `${scope}:${t.slug}:${nextDueIdx}`, windowStart: dateFromIdx(nextDueIdx), windowEnd: null };
    }
    case TriggerType.ONE_TIME_AGE: {
      // Age gate is checked in passesGates via minAge; fires once when crossed.
      return { cycleKey: `${scope}:${t.slug}:once`, windowStart: dateFromIdx(nowIdx), windowEnd: null };
    }
    default:
      return null; // WEATHER is reserved (P2) and never seeded active.
  }
}

export function evaluate(
  catalog: EngineTemplate[],
  recipients: EngineRecipient[],
  circle: CircleState,
  now: Date,
): EvaluateResult {
  const create: NewSuggestion[] = [];
  // Dedupe against persisted rows and within this run (idempotent sweeps → one row/cycle).
  const seen = new Set(circle.existing.map((s) => `${s.templateId}|${s.cycleKey}`));

  for (const t of catalog) {
    if (!t.active || t.triggerType === TriggerType.WEATHER) continue;

    const subjects: Array<{ scope: string; recipientId: string | null; recip: EngineRecipient | null }> =
      t.recipientAgnostic
        ? [{ scope: "circle", recipientId: null, recip: null }]
        : recipients.map((r) => ({ scope: `recip_${r.id}`, recipientId: r.id, recip: r }));

    for (const s of subjects) {
      const tz = s.recip?.timezone ?? circle.timezone;
      const nowYear = localDateOf(now, tz).year;

      if (s.recip && !passesGates(t, s.recip, nowYear)) continue;

      const completions = s.recip?.lastCompletionByTemplate ?? circle.lastCompletionByTemplate;
      const fire = computeFire(t, s.scope, tz, now, s.recip?.createdAt ?? null, completions[t.slug]);
      if (!fire) continue;

      const key = `${t.id}|${fire.cycleKey}`;
      if (seen.has(key)) continue;
      seen.add(key);

      const age = s.recip ? ageFromBirthYear(s.recip.birthYear, nowYear) : null;
      create.push({
        circleId: circle.circleId,
        recipientId: s.recipientId,
        templateId: t.id,
        cycleKey: fire.cycleKey,
        title: t.title,
        reason: renderReason(t, {
          name: s.recip?.name ?? "The family",
          age,
          region: s.recip?.climateRegion ?? null,
          windowStart: fire.windowStart,
          windowEnd: fire.windowEnd,
        }),
        windowStart: fire.windowStart,
        windowEnd: fire.windowEnd,
      });
    }
  }

  // EXPIRE: PENDING/SNOOZED suggestions whose window has closed (kept for metrics).
  const nowIdxCircle = localDayIndex(now, circle.timezone);
  const expire = circle.existing
    .filter(
      (sg) =>
        (sg.status === "PENDING" || sg.status === "SNOOZED") &&
        sg.windowEnd != null &&
        Math.floor(sg.windowEnd.getTime() / MS_PER_DAY) < nowIdxCircle,
    )
    .map((sg) => sg.id);

  return { create, expire };
}

export { dateAtLocalMidnight };
