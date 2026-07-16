import { describe, expect, it } from "vitest";
import {
  addDays,
  refillRunOutDate,
  refillTaskDueDate,
  isRefillDue,
  refillTaskTitle,
  REFILL_LEAD_DAYS,
} from "@/lib/refills";

const base = { active: true as boolean };

describe("refill date math", () => {
  it("returns null when refill tracking is not configured", () => {
    expect(refillRunOutDate({ ...base, refillIntervalDays: null, lastFilledAt: new Date() })).toBeNull();
    expect(refillRunOutDate({ ...base, refillIntervalDays: 30, lastFilledAt: null })).toBeNull();
  });

  it("run-out = lastFilled + interval", () => {
    const lastFilledAt = new Date("2026-01-01T00:00:00Z");
    const runOut = refillRunOutDate({ ...base, refillIntervalDays: 30, lastFilledAt });
    expect(runOut).toEqual(addDays(lastFilledAt, 30));
  });

  it("task surfaces leadDays before run-out", () => {
    const lastFilledAt = new Date("2026-01-01T00:00:00Z");
    const due = refillTaskDueDate({ ...base, refillIntervalDays: 30, lastFilledAt });
    expect(due).toEqual(addDays(lastFilledAt, 30 - REFILL_LEAD_DAYS));
  });

  it("is due once within the lead window", () => {
    const lastFilledAt = new Date("2026-01-01T00:00:00Z");
    const med = { ...base, refillIntervalDays: 30, lastFilledAt };
    // 22 days later = still before the 23-day surface date → not due
    expect(isRefillDue(med, addDays(lastFilledAt, 22))).toBe(false);
    // 24 days later = past the surface date → due
    expect(isRefillDue(med, addDays(lastFilledAt, 24))).toBe(true);
  });

  it("an inactive med is never due", () => {
    const lastFilledAt = new Date("2026-01-01T00:00:00Z");
    expect(isRefillDue({ active: false, refillIntervalDays: 30, lastFilledAt }, addDays(lastFilledAt, 60))).toBe(false);
  });

  it("titles the task with the pharmacy when present", () => {
    expect(refillTaskTitle({ name: "Metformin", pharmacy: "CVS" })).toBe("Refill Metformin — CVS");
    expect(refillTaskTitle({ name: "Metformin", pharmacy: null })).toBe("Refill Metformin");
  });
});
