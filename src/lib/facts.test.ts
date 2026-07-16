import { describe, expect, it } from "vitest";
import { ALL_FACTS, defaultFactsFor, isFactValue, isKnownFactKey, getFact } from "@/lib/facts";

describe("facts registry", () => {
  it("has unique keys", () => {
    const keys = ALL_FACTS.map((f) => f.key);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("validates fact values", () => {
    expect(isFactValue("true")).toBe(true);
    expect(isFactValue("false")).toBe(true);
    expect(isFactValue("unknown")).toBe(true);
    expect(isFactValue("maybe")).toBe(false);
  });

  it("recognizes known keys", () => {
    expect(isKnownFactKey("hasLawn")).toBe(true);
    expect(isKnownFactKey("hasWings")).toBe(false);
    expect(getFact("hasLawn")?.label).toBe("Lawn");
  });

  it("defaults every fact to unknown for an unspecified residence", () => {
    const facts = defaultFactsFor(null);
    expect(Object.keys(facts).length).toBe(ALL_FACTS.length);
    expect(Object.values(facts).every((v) => v === "unknown")).toBe(true);
  });

  it("prefills apartment: no lawn/gutters/driveway, but unknown health facts", () => {
    const facts = defaultFactsFor("APARTMENT");
    expect(facts.hasLawn).toBe("false");
    expect(facts.hasGutters).toBe("false");
    expect(facts.hasDriveway).toBe("false");
    expect(facts.hasDiabetes).toBe("unknown");
  });

  it("houses default everything to unknown (no assumptions)", () => {
    const facts = defaultFactsFor("HOUSE");
    expect(Object.values(facts).every((v) => v === "unknown")).toBe(true);
  });
});
