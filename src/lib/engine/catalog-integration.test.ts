/**
 * Functional UAT: runs the REAL Appendix-A catalog through the REAL engine for a
 * realistic parent, asserting the right suggestions surface (and the wrong ones don't)
 * at seasonal dates. This is the closest thing to a click-through without a database —
 * it catches catalog/gate integration bugs (a template that can never fire, a wrong
 * window, a mis-set gate) that per-unit engine tests with synthetic templates miss.
 */
import { describe, expect, it } from "vitest";
import { CATALOG, type CatalogEntry } from "@/lib/catalog-data";
import { evaluate } from "./evaluate";
import type { EngineTemplate, EngineRecipient, CircleState } from "./types";

function toTemplate(e: CatalogEntry): EngineTemplate {
  const { circleLevel, ...gates } = e.gates ?? {};
  return {
    id: `tpl-${e.slug}`, slug: e.slug, title: e.title, reasonTemplate: e.reasonTemplate,
    category: e.category, triggerType: e.triggerType,
    windowStartMonth: e.windowStartMonth ?? null, windowStartDay: e.windowStartDay ?? null,
    windowEndMonth: e.windowEndMonth ?? null, windowEndDay: e.windowEndDay ?? null,
    intervalDays: e.intervalDays ?? null, intervalAnchor: e.intervalAnchor ?? null,
    leadDays: e.leadDays ?? 14, minAge: e.minAge ?? null, gates,
    climateSensitive: e.climateSensitive ?? false,
    defaultTaskType: e.defaultTaskType ?? "Household", defaultRecurrence: e.defaultRecurrence ?? "NONE",
    active: e.active ?? true, recipientAgnostic: circleLevel === true,
  };
}

const catalog = CATALOG.map(toTemplate);

// Margaret, 78 (born 1948), a homeowner in temperate NoVA with diabetes, still driving,
// with retirement accounts, on 2 meds. New recipient (created today), no task history.
function margaret(now: Date): EngineRecipient {
  return {
    id: "mom", name: "Margaret", relationship: "Mom", birthYear: 1948,
    timezone: "America/New_York", climateRegion: "TEMPERATE", residenceType: "HOUSE",
    createdAt: now,
    facts: {
      hasLawn: "true", hasGutters: "true", hasDriveway: "true", hasFireplace: "true",
      hasCar: "true", hasStairs: "true", livesAlone: "true", hasBasement: "true",
      hasWindowAC: "false", hasPets: "false",
      drives: "true", hasDiabetes: "true", hasHeartCondition: "false",
      enrolledMedicareAdvantage: "false", hasRetirementAccounts: "true",
    },
    activeMedCount: 2, suppressedSlugs: new Set(), lastCompletionByTemplate: {},
  };
}

function slugsAt(dateISO: string): Set<string> {
  const now = new Date(dateISO);
  const circle: CircleState = { circleId: "c1", timezone: "America/New_York", existing: [], lastCompletionByTemplate: {} };
  const { create } = evaluate(catalog, [margaret(now)], circle, now);
  // Map templateId (tpl-<slug>) back to slug.
  return new Set(create.map((c) => c.templateId.replace(/^tpl-/, "")));
}

describe("catalog × engine — realistic parent, seasonal surfacing", () => {
  it("mid-September: heating-season + fall-medical items surface", () => {
    const s = slugsAt("2026-09-15T12:00:00Z");
    expect(s).toContain("furnace-tuneup-fall"); // Sep 1 – Oct 31
    expect(s).toContain("flu-shot"); // age 78, Sep–Oct
    expect(s).toContain("chimney-inspect"); // has fireplace, Aug–Oct
    expect(s).toContain("roof-inspect-fall"); // house, Sep–Nov
    expect(s).not.toContain("ac-tuneup-spring"); // spring window
  });

  it("late October: Medicare OEP + winterization surface", () => {
    const s = slugsAt("2026-10-20T12:00:00Z");
    expect(s).toContain("medicare-oep"); // Oct 15 – Dec 7, age 78
    expect(s).toContain("gutter-clean-fall"); // has gutters, Oct 15 – Nov 30
    expect(s).toContain("hose-bib-winterize"); // house, Oct window
  });

  it("early March: tax filing is circle-level; spring home items surface", () => {
    const now = new Date("2026-03-01T12:00:00Z");
    const circle: CircleState = { circleId: "c1", timezone: "America/New_York", existing: [], lastCompletionByTemplate: {} };
    const { create } = evaluate(catalog, [margaret(now)], circle, now);
    const tax = create.find((c) => c.templateId === "tpl-tax-filing");
    expect(tax, "tax-filing should fire in March").toBeTruthy();
    expect(tax!.recipientId, "tax-filing is circle-level (no recipient)").toBeNull();
    expect(create.some((c) => c.templateId === "tpl-ac-tuneup-spring")).toBe(true);
  });

  it("interval ASSUME_DUE items fire immediately for a new recipient", () => {
    const s = slugsAt("2026-07-16T12:00:00Z");
    expect(s).toContain("dryer-vent-clean");
    expect(s).toContain("dental-cleaning");
    expect(s).toContain("car-service"); // has car
    expect(s).toContain("brown-bag-review"); // >= 1 med
    expect(s).toContain("annual-wellness-visit"); // age >= 65
    expect(s).toContain("catalog-review"); // July, circle-level meta template
  });

  it("gates respect this parent's facts", () => {
    const s = slugsAt("2026-10-20T12:00:00Z");
    expect(s).not.toContain("snow-contract"); // TEMPERATE, not a snow region
    expect(s).not.toContain("ice-melt-stock"); // snow region only
    expect(s).toContain("eye-exam-diabetes"); // hasDiabetes = true
    expect(s).not.toContain("eye-exam-general"); // blocked because diabetes is true
    expect(s).not.toContain("window-ac-remove"); // no window AC
  });

  it("does not surface default-off templates", () => {
    const s = slugsAt("2026-09-15T12:00:00Z");
    expect(s).not.toContain("termite-inspect");
    expect(s).not.toContain("pest-control");
    expect(s).not.toContain("colonoscopy");
  });

  it("every fired suggestion renders its reason with no leftover placeholders", () => {
    const now = new Date("2026-10-20T12:00:00Z");
    const circle: CircleState = { circleId: "c1", timezone: "America/New_York", existing: [], lastCompletionByTemplate: {} };
    const { create } = evaluate(catalog, [margaret(now)], circle, now);
    expect(create.length).toBeGreaterThan(3);
    for (const c of create) {
      expect(c.reason, c.templateId).not.toMatch(/\{[a-zA-Z]+\}/); // no unrendered {name}/{window}/…
      expect(c.reason.length, c.templateId).toBeGreaterThan(0);
    }
  });
});
