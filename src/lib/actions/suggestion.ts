"use server";

import { prisma } from "@/lib/db";
import { AuthorizationError, requireCircleContext } from "@/lib/access";
import { revalidatePath } from "next/cache";
import { SuggestionStatus, DismissReason, Recurrence, FactSource } from "@prisma/client";
import { z } from "zod";
import { sweepCircle } from "@/lib/jobs/sweep";

const idSchema = z.string().min(1, "ID is required");
const RECURRENCES = ["NONE", "DAYS", "WEEKLY", "MONTHLY", "YEARLY", "SEASONAL"] as const;
const SNOOZE_DAYS = 14;

async function requireSuggestion(id: string, circleId: string) {
  const suggestion = await prisma.suggestion.findFirst({
    where: { id, circleId },
    include: { template: true },
  });
  if (!suggestion) throw new AuthorizationError("Suggestion not found in your circle");
  return suggestion;
}

/** Re-run the engine for the caller's circle (§11.3: engine re-runs on save / on demand). */
export async function refreshSuggestions() {
  const { circleId } = await requireCircleContext();
  const counts = await sweepCircle(circleId);
  revalidatePath("/dashboard");
  revalidatePath("/parents");
  return counts;
}

/** Pending inbox: PENDING plus SNOOZED whose snooze has elapsed. Ordered by window. */
export async function getPendingSuggestions(now: Date = new Date()) {
  const { circleId } = await requireCircleContext();
  return prisma.suggestion.findMany({
    where: {
      circleId,
      OR: [
        { status: SuggestionStatus.PENDING },
        { status: SuggestionStatus.SNOOZED, snoozedUntil: { lte: now } },
      ],
    },
    include: { recipient: { select: { name: true, relationship: true } } },
    orderBy: { windowStart: "asc" },
  });
}

const acceptSchema = z.object({
  dueDate: z.string().refine((v) => !v || !Number.isNaN(Date.parse(v)), "Invalid date").nullable().optional(),
  assigneeId: z.string().min(1).nullable().optional(),
  recurrence: z.enum(RECURRENCES).optional(),
  recurEveryDays: z.number().int().gte(1).lte(3650).nullable().optional(),
});

/**
 * Accept → materialize a Task from the suggestion (§11.3). Optional overrides let the
 * user adjust date/assignee/cadence in the same sheet before accepting; the template's
 * defaults fill the rest. The task carries suggestion + template provenance for metrics.
 */
export async function acceptSuggestion(id: string, overrides: z.input<typeof acceptSchema> = {}) {
  const validId = idSchema.parse(id);
  const v = acceptSchema.parse(overrides);
  const { user, circleId } = await requireCircleContext();
  const s = await requireSuggestion(validId, circleId);
  if (s.status === SuggestionStatus.ACCEPTED) throw new AuthorizationError("Already accepted");

  if (v.assigneeId) {
    const member = await prisma.membership.findUnique({
      where: { userId_circleId: { userId: v.assigneeId, circleId } },
      select: { id: true },
    });
    if (!member) throw new AuthorizationError("Assignee is not in your circle");
  }

  const recurrence = (v.recurrence as Recurrence) ?? s.template?.defaultRecurrence ?? Recurrence.NONE;
  const dueDate = v.dueDate !== undefined ? (v.dueDate ? new Date(v.dueDate) : null) : s.windowStart;

  const [task] = await prisma.$transaction([
    prisma.task.create({
      data: {
        circleId,
        recipientId: s.recipientId,
        title: s.title,
        description: s.reason,
        type: s.template?.defaultTaskType ?? "Household",
        dueDate,
        assigneeId: v.assigneeId ?? null,
        creatorId: user.id,
        recurrence,
        recurEveryDays: recurrence === Recurrence.DAYS ? (v.recurEveryDays ?? s.template?.intervalDays ?? null) : null,
        suggestionId: s.id,
        templateSlug: s.template?.slug ?? null,
      },
    }),
    prisma.suggestion.update({ where: { id: s.id }, data: { status: SuggestionStatus.ACCEPTED } }),
  ]);

  revalidatePath("/dashboard");
  return task;
}

/** Snooze this cycle — resurfaces after 14 days (or expires first if the window closes). */
export async function snoozeSuggestion(id: string, now: Date = new Date()) {
  const validId = idSchema.parse(id);
  const { circleId } = await requireCircleContext();
  await requireSuggestion(validId, circleId);
  const snoozedUntil = new Date(now.getTime() + SNOOZE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.suggestion.update({
    where: { id: validId },
    data: { status: SuggestionStatus.SNOOZED, snoozedUntil },
  });
  revalidatePath("/dashboard");
}

const DISMISS_REASONS = ["NOT_APPLICABLE", "SELF_HANDLED", "NOT_NOW"] as const;

/**
 * Dismiss with a reason (§11.3 feedback loop):
 * - NOT_APPLICABLE → flip the gating fact(s) + suppress; the template and every other
 *   template gated on that fact stop firing.
 * - SELF_HANDLED   → suppress this template only; adjacent ones keep firing.
 * - NOT_NOW        → expire this cycle only; it fires again next cycle.
 */
export async function dismissSuggestion(id: string, reason: (typeof DISMISS_REASONS)[number]) {
  const validId = idSchema.parse(id);
  const validReason = z.enum(DISMISS_REASONS).parse(reason);
  const { circleId } = await requireCircleContext();
  const s = await requireSuggestion(validId, circleId);

  if (validReason === "NOT_NOW") {
    await prisma.suggestion.update({ where: { id: s.id }, data: { status: SuggestionStatus.EXPIRED } });
    revalidatePath("/dashboard");
    return;
  }

  const writes: Promise<unknown>[] = [
    prisma.suggestion.update({
      where: { id: s.id },
      data: { status: SuggestionStatus.DISMISSED, dismissReason: validReason as DismissReason },
    }),
  ];

  // Suppression + fact writes only apply to recipient-scoped suggestions.
  if (s.recipientId && s.template) {
    writes.push(
      prisma.suggestionSuppression.upsert({
        where: { recipientId_templateSlug: { recipientId: s.recipientId, templateSlug: s.template.slug } },
        update: { reason: validReason as DismissReason },
        create: { recipientId: s.recipientId, templateSlug: s.template.slug, reason: validReason as DismissReason },
      }),
    );

    if (validReason === "NOT_APPLICABLE") {
      const gates = (s.template.requiresFacts ?? {}) as { facts?: Record<string, boolean> };
      for (const [key, required] of Object.entries(gates.facts ?? {})) {
        // Flip the gate so this fact stops qualifying (required true → store false, etc.).
        const value = required ? "false" : "true";
        writes.push(
          prisma.profileFact.upsert({
            where: { recipientId_key: { recipientId: s.recipientId, key } },
            update: { value, source: FactSource.DISMISSAL },
            create: { recipientId: s.recipientId, key, value, source: FactSource.DISMISSAL },
          }),
        );
      }
    }
  }

  await Promise.all(writes);
  revalidatePath("/dashboard");
  revalidatePath("/parents");
}
