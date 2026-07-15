/**
 * Refill loop (§6.4) — the logistics job: surface a "Refill X" task before a
 * prescription runs out. Not dose-time adherence. Date math is kept pure here so
 * it can be unit-tested without a database; the DB-touching sweep lives at the bottom.
 */
import { prisma } from "@/lib/db";
import { TaskType, TaskStatus, type Medication } from "@prisma/client";

/** Days before the run-out date that the refill task should appear. */
export const REFILL_LEAD_DAYS = 7;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

type RefillFields = Pick<Medication, "refillIntervalDays" | "lastFilledAt" | "active">;

/** The date the prescription is expected to run out, or null if untracked. */
export function refillRunOutDate(med: RefillFields): Date | null {
  if (!med.refillIntervalDays || !med.lastFilledAt) return null;
  return addDays(med.lastFilledAt, med.refillIntervalDays);
}

/** The date the refill task should first surface (run-out minus the lead), or null. */
export function refillTaskDueDate(med: RefillFields, leadDays = REFILL_LEAD_DAYS): Date | null {
  const runOut = refillRunOutDate(med);
  if (!runOut) return null;
  return addDays(runOut, -leadDays);
}

/** Whether, as of `now`, this med is due for a refill task to be generated. */
export function isRefillDue(med: RefillFields, now: Date, leadDays = REFILL_LEAD_DAYS): boolean {
  if (!med.active) return false;
  const surfaceDate = refillTaskDueDate(med, leadDays);
  if (!surfaceDate) return false;
  return surfaceDate.getTime() <= now.getTime();
}

export function refillTaskTitle(med: Pick<Medication, "name" | "pharmacy">): string {
  return med.pharmacy ? `Refill ${med.name} — ${med.pharmacy}` : `Refill ${med.name}`;
}

/**
 * Generate refill tasks for every active, refill-tracked med in a circle that is
 * due and does not already have an open (non-Resolved) refill task. Returns the
 * count created. Idempotent: one task per cycle, deduped by an open task on the med.
 */
export async function sweepRefills(circleId: string, now: Date = new Date()): Promise<number> {
  const meds = await prisma.medication.findMany({
    where: {
      active: true,
      refillIntervalDays: { not: null },
      lastFilledAt: { not: null },
      recipient: { circleId },
    },
    include: {
      refillTasks: { where: { status: { not: TaskStatus.Resolved } }, select: { id: true } },
    },
  });

  let created = 0;
  for (const med of meds) {
    if (!isRefillDue(med, now)) continue;
    if (med.refillTasks.length > 0) continue; // open refill task already exists → deduped

    await prisma.task.create({
      data: {
        circleId,
        recipientId: med.recipientId,
        medicationId: med.id,
        title: refillTaskTitle(med),
        type: TaskType.Medical,
        status: TaskStatus.Open,
        dueDate: refillRunOutDate(med),
        assigneeId: med.defaultAssigneeId ?? null,
      },
    });
    created += 1;
  }
  return created;
}
