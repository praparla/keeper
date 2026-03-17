/** Pre-defined soft colors for family members. */
export const MEMBER_COLORS: Record<
  string,
  { bg: string; text: string; ring: string }
> = {
  teal: { bg: "bg-teal-100", text: "text-teal-700", ring: "ring-teal-300" },
  rose: { bg: "bg-rose-100", text: "text-rose-700", ring: "ring-rose-300" },
  amber: { bg: "bg-amber-100", text: "text-amber-700", ring: "ring-amber-300" },
  violet: { bg: "bg-violet-100", text: "text-violet-700", ring: "ring-violet-300" },
  sky: { bg: "bg-sky-100", text: "text-sky-700", ring: "ring-sky-300" },
  emerald: { bg: "bg-emerald-100", text: "text-emerald-700", ring: "ring-emerald-300" },
};

export const DEFAULT_MEMBER_COLOR = "teal";

export function getMemberColor(colorName?: string | null) {
  return MEMBER_COLORS[colorName ?? DEFAULT_MEMBER_COLOR] ?? MEMBER_COLORS[DEFAULT_MEMBER_COLOR];
}

export function getInitials(name?: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}
