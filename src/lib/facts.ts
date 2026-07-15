/**
 * Profile-fact registry — the single source of truth for the yes/no/unknown facts
 * that describe a care recipient's home and health. The suggestion engine (M2)
 * evaluates template `requiresFacts` against these keys, so this registry is the
 * contract between onboarding, the "What Keeper knows" screen, and the engine.
 *
 * A fact value is always one of FACT_VALUES. "unknown" is a first-class answer:
 * per §6.2 an unknown fact suppresses dependent suggestions rather than guessing.
 */
import type { ResidenceType } from "@prisma/client";

export const FACT_VALUES = ["true", "false", "unknown"] as const;
export type FactValue = (typeof FACT_VALUES)[number];

export function isFactValue(value: string): value is FactValue {
  return (FACT_VALUES as readonly string[]).includes(value);
}

export type FactCategory = "home" | "health";

export interface FactDefinition {
  key: string;
  /** Short label for the "What Keeper knows" list. */
  label: string;
  /** Interview prompt shown on the onboarding chip. */
  question: string;
  category: FactCategory;
}

/** Home-facts interview (~10 chips, §6.2 / §7.3 step 3). */
export const HOME_FACTS: FactDefinition[] = [
  { key: "hasLawn", label: "Lawn", question: "Has a lawn to mow?", category: "home" },
  { key: "hasDriveway", label: "Driveway", question: "Has a driveway (to shovel/seal)?", category: "home" },
  { key: "hasGutters", label: "Gutters", question: "Has gutters to clean?", category: "home" },
  { key: "hasFireplace", label: "Fireplace", question: "Has a fireplace or chimney?", category: "home" },
  { key: "hasCar", label: "Car", question: "Owns a car?", category: "home" },
  { key: "hasStairs", label: "Stairs", question: "Has stairs in the home?", category: "home" },
  { key: "livesAlone", label: "Lives alone", question: "Lives alone?", category: "home" },
  { key: "hasBasement", label: "Basement", question: "Has a basement?", category: "home" },
  { key: "hasWindowAC", label: "Window AC", question: "Uses window AC units?", category: "home" },
  { key: "hasPets", label: "Pets", question: "Has pets?", category: "home" },
];

/** Health flags relevant to cadence rules (§6.2 / §7.3 step 4 / §11.3). */
export const HEALTH_FACTS: FactDefinition[] = [
  { key: "drives", label: "Drives", question: "Still driving?", category: "health" },
  { key: "hasDiabetes", label: "Diabetes", question: "Has diabetes?", category: "health" },
  { key: "hasHeartCondition", label: "Heart condition", question: "Has a heart condition?", category: "health" },
  { key: "enrolledMedicareAdvantage", label: "Medicare Advantage", question: "Enrolled in Medicare Advantage?", category: "health" },
  { key: "hasRetirementAccounts", label: "IRA / 401(k)", question: "Has an IRA or 401(k)?", category: "health" },
];

export const ALL_FACTS: FactDefinition[] = [...HOME_FACTS, ...HEALTH_FACTS];

const FACT_BY_KEY = new Map(ALL_FACTS.map((f) => [f.key, f]));

export function getFact(key: string): FactDefinition | undefined {
  return FACT_BY_KEY.get(key);
}

export function isKnownFactKey(key: string): boolean {
  return FACT_BY_KEY.has(key);
}

/**
 * Sensible prefills by residence type (§7.3 step 3: "apartment defaults lawn/gutters
 * to no"). Anything not listed defaults to "unknown" so the interview never guesses.
 */
const RESIDENCE_DEFAULTS: Record<ResidenceType, Record<string, FactValue>> = {
  HOUSE: {},
  CONDO: { hasLawn: "false", hasGutters: "false", hasDriveway: "false", hasBasement: "false" },
  APARTMENT: { hasLawn: "false", hasGutters: "false", hasDriveway: "false", hasBasement: "false", hasFireplace: "false" },
  FACILITY: { hasLawn: "false", hasGutters: "false", hasDriveway: "false", hasBasement: "false", hasFireplace: "false", hasCar: "false", hasStairs: "false" },
};

/** Prefill a fact map from residence type; unspecified keys are "unknown". */
export function defaultFactsFor(residenceType: ResidenceType | null | undefined): Record<string, FactValue> {
  const defaults = residenceType ? RESIDENCE_DEFAULTS[residenceType] : {};
  const out: Record<string, FactValue> = {};
  for (const fact of ALL_FACTS) {
    out[fact.key] = defaults[fact.key] ?? "unknown";
  }
  return out;
}
