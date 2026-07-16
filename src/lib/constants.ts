import type { ResidenceType, ApptStatus, Recurrence } from "@prisma/client";

/**
 * Member colors recalibrated to the warm almanac palette (§8.3):
 * moss, clay, ochre, plum, slate-blue, pine. Same `User.color` mechanism as v1;
 * legacy v1 values (teal/blue/orange/…) alias onto the nearest warm tone so
 * existing rows keep rendering.
 */
export const MEMBER_COLORS: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  moss: { bg: "bg-green-100", text: "text-green-800", ring: "ring-green-300" },
  clay: { bg: "bg-orange-100", text: "text-orange-800", ring: "ring-orange-300" },
  ochre: { bg: "bg-amber-100", text: "text-amber-800", ring: "ring-amber-300" },
  plum: { bg: "bg-purple-100", text: "text-purple-800", ring: "ring-purple-300" },
  slate: { bg: "bg-slate-200", text: "text-slate-800", ring: "ring-slate-400" },
  pine: { bg: "bg-teal-100", text: "text-teal-900", ring: "ring-teal-300" },
};

// Legacy v1 color names → nearest warm tone.
const COLOR_ALIASES: Record<string, keyof typeof MEMBER_COLORS> = {
  teal: "pine",
  emerald: "moss",
  amber: "ochre",
  orange: "clay",
  rose: "clay",
  violet: "plum",
  sky: "slate",
  blue: "slate",
  green: "moss",
};

export const MEMBER_COLOR_NAMES = Object.keys(MEMBER_COLORS);
export const DEFAULT_MEMBER_COLOR = "moss";

export function getMemberColor(colorName?: string | null) {
  const key = colorName ?? DEFAULT_MEMBER_COLOR;
  const resolved = MEMBER_COLORS[key] ?? MEMBER_COLORS[COLOR_ALIASES[key] ?? DEFAULT_MEMBER_COLOR];
  return resolved ?? MEMBER_COLORS[DEFAULT_MEMBER_COLOR];
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export const RESIDENCE_LABELS: Record<ResidenceType, string> = {
  HOUSE: "House",
  CONDO: "Condo",
  APARTMENT: "Apartment",
  FACILITY: "Care facility",
};

export const APPT_STATUS_LABELS: Record<ApptStatus, string> = {
  SCHEDULED: "Scheduled",
  DONE: "Done",
  CANCELLED: "Cancelled",
};

export const RECURRENCE_LABELS: Record<Recurrence, string> = {
  NONE: "Does not repeat",
  DAYS: "Every N days",
  WEEKLY: "Weekly",
  MONTHLY: "Monthly",
  YEARLY: "Yearly",
  SEASONAL: "Seasonal window",
};

/**
 * Almanac date formatting — "Oct 15", never ISO strings in UI (§8.4). Date-only values
 * (task due dates, suggestion windows, refill run-outs) are stored as UTC midnight, so
 * they must render in UTC or they slip a day in negative-offset timezones (most US users).
 */
export function formatAlmanacDate(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** For real instants (appointment times), rendered in the viewer's local timezone. */
export function formatAlmanacDateTime(date: Date | string | null | undefined): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}
