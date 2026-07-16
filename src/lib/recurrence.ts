/**
 * Recurrence date math (§6.3) — materialized-next-instance model: completing a
 * recurring task spawns the next instance with the next due date. No virtual
 * occurrences. Pure functions so the cadence rules are unit-testable.
 */
import { Recurrence } from "@prisma/client";

export interface RecurrenceConfig {
  recurrence: Recurrence;
  recurEveryDays?: number | null;
  windowStartMonth?: number | null;
  windowStartDay?: number | null;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
}

function addMonths(date: Date, months: number): Date {
  const d = new Date(date.getTime());
  const targetMonth = d.getMonth() + months;
  const target = new Date(d.getFullYear(), targetMonth, 1);
  // Clamp day to the target month's length (e.g. Jan 31 + 1mo → Feb 28).
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d.getDate(), lastDay));
  target.setHours(d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  return target;
}

/**
 * Compute the next due date for a recurring task, given the instance that was just
 * completed. `from` is the completed instance's due date, or `now` when it had none.
 * Returns null for NONE or an incomplete config (which the caller treats as "no next
 * instance" — a recurring task missing its cadence field simply doesn't repeat).
 */
export function nextDueDate(config: RecurrenceConfig, from: Date, now: Date = new Date()): Date | null {
  const base = from ?? now;
  switch (config.recurrence) {
    case Recurrence.NONE:
      return null;
    case Recurrence.DAYS:
      if (!config.recurEveryDays || config.recurEveryDays < 1) return null;
      return addDays(base, config.recurEveryDays);
    case Recurrence.WEEKLY:
      return addDays(base, 7);
    case Recurrence.MONTHLY:
      return addMonths(base, 1);
    case Recurrence.YEARLY:
      return addMonths(base, 12);
    case Recurrence.SEASONAL: {
      // Next occurrence of the window's start (month/day), strictly after `now`.
      if (!config.windowStartMonth || !config.windowStartDay) return null;
      let year = now.getFullYear();
      let candidate = new Date(year, config.windowStartMonth - 1, config.windowStartDay);
      if (candidate.getTime() <= now.getTime()) {
        year += 1;
        candidate = new Date(year, config.windowStartMonth - 1, config.windowStartDay);
      }
      return candidate;
    }
    default:
      return null;
  }
}

export function isRecurring(config: Pick<RecurrenceConfig, "recurrence">): boolean {
  return config.recurrence !== Recurrence.NONE;
}

/** Human cadence label for the edit sheet / task card. */
export function recurrenceLabel(config: RecurrenceConfig): string | null {
  switch (config.recurrence) {
    case Recurrence.NONE:
      return null;
    case Recurrence.DAYS:
      return config.recurEveryDays ? `Every ${config.recurEveryDays} days` : "Repeats";
    case Recurrence.WEEKLY:
      return "Weekly";
    case Recurrence.MONTHLY:
      return "Monthly";
    case Recurrence.YEARLY:
      return "Yearly";
    case Recurrence.SEASONAL:
      return "Seasonal";
    default:
      return null;
  }
}
