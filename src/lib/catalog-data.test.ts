import { describe, expect, it } from "vitest";
import { CATALOG } from "@/lib/catalog-data";

describe("catalog integrity (§12.3)", () => {
  it("has unique slugs", () => {
    const slugs = CATALOG.map((t) => t.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("has ≥50 templates with a sensible active-by-default majority", () => {
    expect(CATALOG.length).toBeGreaterThanOrEqual(50);
    const active = CATALOG.filter((t) => t.active ?? true).length;
    // Spec: ~35 active of ~52. This catalog is slightly more granular; keep a broad band.
    expect(active).toBeGreaterThanOrEqual(30);
    expect(active).toBeLessThanOrEqual(45);
  });

  it("every template has a non-empty reason and a source URL", () => {
    for (const t of CATALOG) {
      expect(t.reasonTemplate.trim().length, t.slug).toBeGreaterThan(0);
      expect(t.sourceUrl, t.slug).toMatch(/^https?:\/\//);
    }
  });

  it("every trigger type has a valid window/interval combination", () => {
    for (const t of CATALOG) {
      if (t.triggerType === "SEASONAL_WINDOW" || t.triggerType === "FIXED_DATE") {
        expect(t.windowStartMonth, t.slug).toBeGreaterThanOrEqual(1);
        expect(t.windowEndMonth, t.slug).toBeGreaterThanOrEqual(1);
        expect(t.intervalDays, t.slug).toBeUndefined();
      } else if (t.triggerType === "INTERVAL") {
        expect(t.intervalDays, t.slug).toBeGreaterThan(0);
        expect(t.intervalAnchor, t.slug).toBeDefined();
      } else if (t.triggerType === "ONE_TIME_AGE") {
        // age gate (minAge) or a non-age gate (minActiveMeds) must exist.
        expect(Boolean(t.minAge) || Boolean(t.gates?.minActiveMeds), t.slug).toBe(true);
      }
      expect(t.triggerType, t.slug).not.toBe("WEATHER"); // reserved, never seeded
    }
  });

  it("month/day fields are in range", () => {
    for (const t of CATALOG) {
      for (const m of [t.windowStartMonth, t.windowEndMonth]) {
        if (m != null) expect(m, t.slug).toBeLessThanOrEqual(12);
      }
      for (const d of [t.windowStartDay, t.windowEndDay]) {
        if (d != null) expect(d, t.slug).toBeLessThanOrEqual(31);
      }
    }
  });
});
