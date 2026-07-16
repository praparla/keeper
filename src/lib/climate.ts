/**
 * Climate calibration (§11.4). A coarse ZIP → region table drives two things:
 * suppression (no snow templates in WARM_NO_SNOW) and window shifting (hose-bib
 * winterization ≈ 2 weeks before the region's median first frost). NOAA normals
 * are the calibration source; live weather is P2. Overridable on "What Keeper knows."
 */

export const CLIMATE_REGIONS = ["SNOW_COLD", "TEMPERATE", "WARM_NO_SNOW", "HOT_ARID"] as const;
export type ClimateRegion = (typeof CLIMATE_REGIONS)[number];

export function isClimateRegion(value: string): value is ClimateRegion {
  return (CLIMATE_REGIONS as readonly string[]).includes(value);
}

/**
 * Coarse ZIP3-prefix → region map. Keyed on the first three digits so a handful of
 * ranges cover the country without a 40k-row table; refine specific ZIP3s as needed.
 * Anything unmatched falls back by leading digit (see regionForZip).
 */
const ZIP1_DEFAULTS: Record<string, ClimateRegion> = {
  "0": "SNOW_COLD", // New England
  "1": "SNOW_COLD", // NY / PA
  "2": "TEMPERATE", // Mid-Atlantic / DC / VA
  "3": "WARM_NO_SNOW", // Southeast / FL / GA
  "4": "SNOW_COLD", // Great Lakes / OH / IN / MI / KY
  "5": "SNOW_COLD", // Upper Midwest / MN / IA / MT
  "6": "TEMPERATE", // Central plains / KS / MO / IL
  "7": "WARM_NO_SNOW", // TX / LA / OK / AR
  "8": "HOT_ARID", // Mountain West / AZ / NM / CO / NV
  "9": "TEMPERATE", // West Coast / CA / OR / WA
};

// Targeted overrides where the leading digit misclassifies (mountain-cold, desert-hot).
const ZIP3_OVERRIDES: Record<string, ClimateRegion> = {
  // Colorado front range / high country → snow
  "800": "SNOW_COLD", "801": "SNOW_COLD", "802": "SNOW_COLD", "803": "SNOW_COLD", "804": "SNOW_COLD",
  // Phoenix / Tucson deserts stay hot-arid (already 85xxx → 8, HOT_ARID) — keep.
  // South Florida → warm-no-snow (331–349 already 3 → WARM_NO_SNOW) — keep.
  // Southern CA deserts → hot-arid
  "922": "HOT_ARID", "923": "HOT_ARID",
  // Pacific NW inland / mountain → snow
  "838": "SNOW_COLD",
};

export function regionForZip(zip: string | null | undefined): ClimateRegion | null {
  if (!zip) return null;
  const digits = zip.replace(/\D/g, "");
  if (digits.length < 1) return null;
  const zip3 = digits.slice(0, 3);
  if (ZIP3_OVERRIDES[zip3]) return ZIP3_OVERRIDES[zip3];
  return ZIP1_DEFAULTS[digits[0]] ?? null;
}

/** Whether a region gets meaningful snow (gates snow-removal / ice-melt templates). */
export function hasSnow(region: ClimateRegion): boolean {
  return region === "SNOW_COLD";
}

/** Median first-frost anchor per region (month/day), or null where frost is not a factor. */
export const FROST_ANCHOR: Record<ClimateRegion, { month: number; day: number } | null> = {
  SNOW_COLD: { month: 10, day: 15 },
  TEMPERATE: { month: 11, day: 1 },
  WARM_NO_SNOW: null,
  HOT_ARID: { month: 11, day: 15 },
};

/** Human first-frost phrase for reason-line rendering ("late October"). */
export function frostPhrase(region: ClimateRegion | null): string {
  const anchor = region ? FROST_ANCHOR[region] : null;
  if (!anchor) return "the first cold snap";
  const d = new Date(2000, anchor.month - 1, anchor.day);
  const part = anchor.day <= 10 ? "early" : anchor.day <= 20 ? "mid" : "late";
  return `${part} ${d.toLocaleDateString("en-US", { month: "long" })}`;
}
