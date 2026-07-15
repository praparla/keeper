import { describe, expect, it } from "vitest";
import { regionForZip, hasSnow, frostPhrase } from "@/lib/climate";

describe("climate", () => {
  it("maps ZIPs to coarse regions by leading digit", () => {
    expect(regionForZip("02138")).toBe("SNOW_COLD"); // Boston
    expect(regionForZip("20147")).toBe("TEMPERATE"); // NoVA
    expect(regionForZip("33139")).toBe("WARM_NO_SNOW"); // Miami
    expect(regionForZip("85001")).toBe("HOT_ARID"); // Phoenix
  });

  it("applies ZIP3 overrides where the leading digit misclassifies", () => {
    expect(regionForZip("80202")).toBe("SNOW_COLD"); // Denver (8 → HOT_ARID by default)
  });

  it("returns null for missing/empty zip", () => {
    expect(regionForZip(null)).toBeNull();
    expect(regionForZip("")).toBeNull();
  });

  it("only SNOW_COLD gets snow templates", () => {
    expect(hasSnow("SNOW_COLD")).toBe(true);
    expect(hasSnow("WARM_NO_SNOW")).toBe(false);
  });

  it("renders a human frost phrase, with a fallback for no-frost regions", () => {
    expect(frostPhrase("SNOW_COLD")).toBe("mid October");
    expect(frostPhrase("WARM_NO_SNOW")).toBe("the first cold snap");
    expect(frostPhrase(null)).toBe("the first cold snap");
  });
});
