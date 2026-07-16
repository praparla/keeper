import { describe, expect, it } from "vitest";
import { evaluate } from "./evaluate";
import type { EngineTemplate, EngineRecipient, CircleState, ExistingSuggestion } from "./types";

// ── fixtures ──
function buildTemplate(over: Partial<EngineTemplate> = {}): EngineTemplate {
  return {
    id: over.slug ? `tpl-${over.slug}` : "tpl-1",
    slug: "furnace-tuneup-fall",
    title: "Furnace tune-up",
    reasonTemplate: "{name}'s furnace is due before heating season — {window}.",
    category: "HOME_SEASONAL",
    triggerType: "SEASONAL_WINDOW",
    windowStartMonth: 9, windowStartDay: 1, windowEndMonth: 10, windowEndDay: 31,
    intervalDays: null, intervalAnchor: null,
    leadDays: 14, minAge: null, gates: {}, climateSensitive: false,
    defaultTaskType: "Household", defaultRecurrence: "NONE",
    active: true, recipientAgnostic: false,
    ...over,
  };
}

function buildRecipient(over: Partial<EngineRecipient> = {}): EngineRecipient {
  return {
    id: "r1", name: "Margaret", relationship: "Mom", birthYear: 1948,
    timezone: "UTC", climateRegion: "TEMPERATE", residenceType: "HOUSE",
    createdAt: new Date("2026-01-01T00:00:00Z"),
    facts: {}, activeMedCount: 0, suppressedSlugs: new Set(), lastCompletionByTemplate: {},
    ...over,
  };
}

function circleState(over: Partial<CircleState> = {}): CircleState {
  return { circleId: "c1", timezone: "UTC", existing: [], lastCompletionByTemplate: {}, ...over };
}

const at = (iso: string) => new Date(iso);

describe("engine — seasonal windows (fire/skip/expire)", () => {
  it("fires inside the window", () => {
    const { create } = evaluate([buildTemplate()], [buildRecipient()], circleState(), at("2026-09-15T12:00:00Z"));
    expect(create).toHaveLength(1);
    expect(create[0].cycleKey).toBe("recip_r1:2026-furnace-tuneup-fall");
    expect(create[0].reason).toContain("Margaret's furnace");
    expect(create[0].reason).toContain("Sep 1 – Oct 31");
  });

  it("skips before the lead window opens", () => {
    const { create } = evaluate([buildTemplate()], [buildRecipient()], circleState(), at("2026-07-01T12:00:00Z"));
    expect(create).toHaveLength(0);
  });

  it("fires within the lead window (leadDays before window start)", () => {
    // 14-day lead → Aug 18 onward.
    const { create } = evaluate([buildTemplate()], [buildRecipient()], circleState(), at("2026-08-20T12:00:00Z"));
    expect(create).toHaveLength(1);
  });

  it("expires PENDING suggestions past windowEnd", () => {
    const existing: ExistingSuggestion[] = [
      { id: "s1", templateId: "tpl-1", cycleKey: "recip_r1:2026-furnace-tuneup-fall", status: "PENDING", windowEnd: at("2026-10-31T00:00:00Z") },
    ];
    const { expire } = evaluate([buildTemplate()], [buildRecipient()], circleState({ existing }), at("2026-11-15T12:00:00Z"));
    expect(expire).toEqual(["s1"]);
  });

  it("expires SNOOZED suggestions past windowEnd (not resurfaced)", () => {
    const existing: ExistingSuggestion[] = [
      { id: "s2", templateId: "tpl-1", cycleKey: "recip_r1:2026-furnace-tuneup-fall", status: "SNOOZED", windowEnd: at("2026-10-31T00:00:00Z") },
    ];
    const { expire } = evaluate([buildTemplate()], [buildRecipient()], circleState({ existing }), at("2026-11-15T12:00:00Z"));
    expect(expire).toEqual(["s2"]);
  });
});

describe("engine — window edge cases (§12.3)", () => {
  it("year-wrapping window keys on the window-start year", () => {
    const t = buildTemplate({ slug: "winter-x", windowStartMonth: 12, windowStartDay: 1, windowEndMonth: 2, windowEndDay: 28 });
    const { create } = evaluate([t], [buildRecipient()], circleState(), at("2026-01-15T12:00:00Z"));
    expect(create).toHaveLength(1);
    expect(create[0].cycleKey).toBe("recip_r1:2025-winter-x"); // opened Dec 2025
  });

  it("lead crossing a year boundary fires in the prior year", () => {
    const t = buildTemplate({ slug: "jan-x", windowStartMonth: 1, windowStartDay: 5, windowEndMonth: 1, windowEndDay: 20, leadDays: 14 });
    const { create } = evaluate([t], [buildRecipient()], circleState(), at("2025-12-25T12:00:00Z"));
    expect(create).toHaveLength(1);
    expect(create[0].cycleKey).toBe("recip_r1:2026-jan-x"); // Dec 22 2025 lead for the Jan 2026 window
  });

  it("handles a Feb 29 window in a leap year without error", () => {
    const t = buildTemplate({ slug: "leap-x", windowStartMonth: 2, windowStartDay: 1, windowEndMonth: 2, windowEndDay: 29 });
    const { create } = evaluate([t], [buildRecipient()], circleState(), at("2028-02-29T12:00:00Z"));
    expect(create).toHaveLength(1);
  });

  it("resolves windows in the recipient's timezone", () => {
    // 03:00 UTC on Sep 1 is still Aug 31 in New York — window opens Sep 1, so before lead it must still fire (lead covers Aug).
    const t = buildTemplate();
    const ny = buildRecipient({ timezone: "America/New_York" });
    const { create } = evaluate([t], [ny], circleState(), at("2026-09-15T12:00:00Z"));
    expect(create).toHaveLength(1);
  });
});

describe("engine — interval anchoring (§11.2)", () => {
  it("ASSUME_DUE fires immediately for a brand-new recipient with no history", () => {
    const t = buildTemplate({ slug: "dryer-vent", triggerType: "INTERVAL", intervalDays: 365, intervalAnchor: "ASSUME_DUE", windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const { create } = evaluate([t], [buildRecipient()], circleState(), at("2026-06-01T12:00:00Z"));
    expect(create).toHaveLength(1);
    expect(create[0].cycleKey).toBe("recip_r1:dryer-vent:init");
  });

  it("START_FRESH waits one interval from recipient creation", () => {
    const t = buildTemplate({ slug: "water-heater", triggerType: "INTERVAL", intervalDays: 365, intervalAnchor: "START_FRESH", windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const r = buildRecipient({ createdAt: at("2026-01-01T00:00:00Z") });
    expect(evaluate([t], [r], circleState(), at("2026-06-01T12:00:00Z")).create).toHaveLength(0);
    expect(evaluate([t], [r], circleState(), at("2026-12-25T12:00:00Z")).create).toHaveLength(1);
  });

  it("re-anchors on the last completion", () => {
    const t = buildTemplate({ slug: "car-service", triggerType: "INTERVAL", intervalDays: 182, intervalAnchor: "ASSUME_DUE", windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const r = buildRecipient({ lastCompletionByTemplate: { "car-service": at("2026-06-01T00:00:00Z") } });
    expect(evaluate([t], [r], circleState(), at("2026-09-01T12:00:00Z")).create).toHaveLength(0); // next due ~Nov 30
    expect(evaluate([t], [r], circleState(), at("2026-11-25T12:00:00Z")).create).toHaveLength(1);
  });
});

describe("engine — gates & dedupe (§11.2 / §12.3)", () => {
  const lawn = buildTemplate({ slug: "lawn", gates: { facts: { hasLawn: true } }, windowStartMonth: 3, windowStartDay: 15, windowEndMonth: 4, windowEndDay: 30 });
  const now = at("2026-04-01T12:00:00Z");

  it("unknown home fact skips, and a fact edit un-skips same-day", () => {
    expect(evaluate([lawn], [buildRecipient({ facts: {} })], circleState(), now).create).toHaveLength(0);
    expect(evaluate([lawn], [buildRecipient({ facts: { hasLawn: "true" } })], circleState(), now).create).toHaveLength(1);
    expect(evaluate([lawn], [buildRecipient({ facts: { hasLawn: "false" } })], circleState(), now).create).toHaveLength(0);
  });

  it("condition fact unknown is treated as false (general eye-exam fires until diabetes is set)", () => {
    const general = buildTemplate({ slug: "eye-general", triggerType: "INTERVAL", intervalDays: 730, intervalAnchor: "ASSUME_DUE", minAge: 65, gates: { facts: { hasDiabetes: false } }, windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const diabetic = buildTemplate({ slug: "eye-diabetes", triggerType: "INTERVAL", intervalDays: 365, intervalAnchor: "ASSUME_DUE", gates: { facts: { hasDiabetes: true } }, windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const unknownDiabetes = buildRecipient({ facts: {} });
    const out = evaluate([general, diabetic], [unknownDiabetes], circleState(), now).create.map((c) => c.templateId);
    expect(out).toContain("tpl-eye-general");
    expect(out).not.toContain("tpl-eye-diabetes");
  });

  it("suppression beats passing gates", () => {
    const r = buildRecipient({ facts: { hasLawn: "true" }, suppressedSlugs: new Set(["lawn"]) });
    expect(evaluate([lawn], [r], circleState(), now).create).toHaveLength(0);
  });

  it("age gate crosses mid-year (year granularity)", () => {
    const t = buildTemplate({ slug: "flu", minAge: 65 });
    // 1962 → age 64 in 2026 → skip
    expect(evaluate([t], [buildRecipient({ birthYear: 1962 })], circleState(), at("2026-09-15T12:00:00Z")).create).toHaveLength(0);
    // 1961 → age 65 in 2026 → fires
    expect(evaluate([buildTemplate({ slug: "flu2", minAge: 65 })], [buildRecipient({ birthYear: 1961 })], circleState(), at("2026-09-15T12:00:00Z")).create).toHaveLength(1);
  });

  it("unknown age skips age-gated templates", () => {
    const t = buildTemplate({ slug: "flu3", minAge: 65 });
    expect(evaluate([t], [buildRecipient({ birthYear: null })], circleState(), at("2026-09-15T12:00:00Z")).create).toHaveLength(0);
  });

  it("climate suppression: snow template + WARM region does not fire", () => {
    const snow = buildTemplate({ slug: "snow", gates: { regions: ["SNOW_COLD"], facts: { hasDriveway: true } }, windowStartMonth: 10, windowStartDay: 1, windowEndMonth: 11, windowEndDay: 15 });
    const warm = buildRecipient({ climateRegion: "WARM_NO_SNOW", facts: { hasDriveway: "true" } });
    expect(evaluate([snow], [warm], circleState(), at("2026-10-15T12:00:00Z")).create).toHaveLength(0);
  });

  it("dedupes the same template+cycle across repeated sweeps", () => {
    const first = evaluate([buildTemplate()], [buildRecipient()], circleState(), at("2026-09-15T12:00:00Z"));
    expect(first.create).toHaveLength(1);
    const existing: ExistingSuggestion[] = [{ id: "s1", templateId: "tpl-1", cycleKey: first.create[0].cycleKey, status: "PENDING", windowEnd: at("2026-10-31T00:00:00Z") }];
    const second = evaluate([buildTemplate()], [buildRecipient()], circleState({ existing }), at("2026-09-16T12:00:00Z"));
    expect(second.create).toHaveLength(0);
  });

  it("does not re-create a cycle already ACCEPTED/DISMISSED (dedupe spans all statuses)", () => {
    // Regression: the sweep must feed terminal-status suggestions into the dedupe set,
    // or the engine re-emits a create that violates the (templateId, cycleKey) unique index.
    for (const status of ["ACCEPTED", "DISMISSED", "EXPIRED"] as const) {
      const existing: ExistingSuggestion[] = [
        { id: "s1", templateId: "tpl-1", cycleKey: "recip_r1:2026-furnace-tuneup-fall", status, windowEnd: at("2026-10-31T00:00:00Z") },
      ];
      const { create } = evaluate([buildTemplate()], [buildRecipient()], circleState({ existing }), at("2026-09-15T12:00:00Z"));
      expect(create, status).toHaveLength(0);
    }
  });

  it("two recipients with different facts get independent outcomes", () => {
    const a = buildRecipient({ id: "rA", facts: { hasLawn: "true" } });
    const b = buildRecipient({ id: "rB", facts: { hasLawn: "false" } });
    const { create } = evaluate([lawn], [a, b], circleState(), now);
    expect(create).toHaveLength(1);
    expect(create[0].recipientId).toBe("rA");
  });
});

describe("engine — one-time-age & circle-level", () => {
  it("ONE_TIME_AGE fires once when the age is crossed", () => {
    const t = buildTemplate({ slug: "rsv", triggerType: "ONE_TIME_AGE", minAge: 75, windowStartMonth: null, windowStartDay: null, windowEndMonth: null, windowEndDay: null });
    const r = buildRecipient({ birthYear: 1950 }); // age 76 in 2026
    const first = evaluate([t], [r], circleState(), at("2026-05-01T12:00:00Z"));
    expect(first.create).toHaveLength(1);
    expect(first.create[0].cycleKey).toBe("recip_r1:rsv:once");
    const existing: ExistingSuggestion[] = [{ id: "s1", templateId: "tpl-rsv", cycleKey: "recip_r1:rsv:once", status: "PENDING", windowEnd: null }];
    expect(evaluate([t], [r], circleState({ existing }), at("2026-06-01T12:00:00Z")).create).toHaveLength(0);
  });

  it("circle-level (recipient-agnostic) templates fire once for the circle", () => {
    const tax = buildTemplate({ slug: "tax-filing", triggerType: "FIXED_DATE", recipientAgnostic: true, windowStartMonth: 2, windowStartDay: 1, windowEndMonth: 4, windowEndDay: 15 });
    const { create } = evaluate([tax], [buildRecipient(), buildRecipient({ id: "r2" })], circleState(), at("2026-03-01T12:00:00Z"));
    expect(create).toHaveLength(1);
    expect(create[0].recipientId).toBeNull();
    expect(create[0].cycleKey).toBe("circle:2026-tax-filing");
  });
});
