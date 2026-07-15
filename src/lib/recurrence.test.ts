import { describe, expect, it } from "vitest";
import { Recurrence } from "@prisma/client";
import { nextDueDate, isRecurring, recurrenceLabel } from "@/lib/recurrence";

describe("nextDueDate", () => {
  const from = new Date("2026-03-10T09:00:00");

  it("returns null for NONE", () => {
    expect(nextDueDate({ recurrence: Recurrence.NONE }, from)).toBeNull();
  });

  it("adds N days for DAYS", () => {
    const next = nextDueDate({ recurrence: Recurrence.DAYS, recurEveryDays: 5 }, from);
    expect(next).toEqual(new Date("2026-03-15T09:00:00"));
  });

  it("returns null when DAYS has no interval", () => {
    expect(nextDueDate({ recurrence: Recurrence.DAYS, recurEveryDays: null }, from)).toBeNull();
  });

  it("adds a week for WEEKLY", () => {
    expect(nextDueDate({ recurrence: Recurrence.WEEKLY }, from)).toEqual(new Date("2026-03-17T09:00:00"));
  });

  it("adds a month for MONTHLY and clamps to month length", () => {
    const jan31 = new Date("2026-01-31T08:00:00");
    const next = nextDueDate({ recurrence: Recurrence.MONTHLY }, jan31);
    // Feb 2026 has 28 days → clamps to Feb 28
    expect(next?.getMonth()).toBe(1);
    expect(next?.getDate()).toBe(28);
  });

  it("adds a year for YEARLY", () => {
    const next = nextDueDate({ recurrence: Recurrence.YEARLY }, from);
    expect(next?.getFullYear()).toBe(2027);
    expect(next?.getMonth()).toBe(2);
  });

  it("SEASONAL returns the next window start strictly after now", () => {
    const now = new Date("2026-06-01T00:00:00");
    const next = nextDueDate(
      { recurrence: Recurrence.SEASONAL, windowStartMonth: 9, windowStartDay: 15 },
      from,
      now,
    );
    expect(next).toEqual(new Date(2026, 8, 15));
  });

  it("SEASONAL rolls to next year when the window already passed", () => {
    const now = new Date("2026-11-01T00:00:00");
    const next = nextDueDate(
      { recurrence: Recurrence.SEASONAL, windowStartMonth: 9, windowStartDay: 15 },
      from,
      now,
    );
    expect(next).toEqual(new Date(2027, 8, 15));
  });
});

describe("recurrence helpers", () => {
  it("isRecurring is false only for NONE", () => {
    expect(isRecurring({ recurrence: Recurrence.NONE })).toBe(false);
    expect(isRecurring({ recurrence: Recurrence.WEEKLY })).toBe(true);
  });

  it("labels DAYS with the interval", () => {
    expect(recurrenceLabel({ recurrence: Recurrence.DAYS, recurEveryDays: 3 })).toBe("Every 3 days");
    expect(recurrenceLabel({ recurrence: Recurrence.NONE })).toBeNull();
  });
});
