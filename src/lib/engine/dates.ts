/**
 * Engine date math. All windows resolve in the recipient's timezone with boundaries
 * inclusive at local midnight (§12.3). We compare at *date* granularity via a UTC-based
 * day index — this sidesteps DST arithmetic entirely (we never compare instants, only
 * calendar dates) while honoring the recipient's local calendar for "what day is it".
 */

export interface LocalDate {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
}

/** The calendar date `instant` falls on, in `timeZone`. */
export function localDateOf(instant: Date, timeZone: string): LocalDate {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}

/** Integer day index for a calendar date (days since 1970-01-01). Date-only, DST-free. */
export function dayIndex(year: number, month: number, day: number): number {
  return Math.floor(Date.UTC(year, month - 1, day) / 86_400_000);
}

export function localDayIndex(instant: Date, timeZone: string): number {
  const d = localDateOf(instant, timeZone);
  return dayIndex(d.year, d.month, d.day);
}

/** A UTC Date pinned to midnight of a calendar date — used for stored windowStart/End. */
export function dateAtLocalMidnight(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day));
}

export interface ResolvedWindow {
  startYear: number;
  windowStart: Date;
  windowEnd: Date;
  startIdx: number; // includes leadDays offset (first day the suggestion may fire)
  endIdx: number;
}

/**
 * The seasonal/fixed-date window occurrence that `nowIdx` currently falls inside,
 * accounting for the lead window and year-wrapping (e.g. a Dec→Feb window). Checks the
 * previous, current, and next calendar years so a lead that crosses a year boundary
 * (Jan 5 window, 14-day lead → starts Dec 22) still resolves. Returns null if none active.
 */
export function resolveWindow(
  nowIdx: number,
  nowYear: number,
  wsm: number,
  wsd: number,
  wem: number,
  wed: number,
  leadDays: number,
): ResolvedWindow | null {
  for (const y of [nowYear - 1, nowYear, nowYear + 1]) {
    const startIdxRaw = dayIndex(y, wsm, wsd);
    const wraps = wem < wsm || (wem === wsm && wed < wsd);
    const endYear = wraps ? y + 1 : y;
    const endIdx = dayIndex(endYear, wem, wed);
    const startIdx = startIdxRaw - leadDays;
    if (nowIdx >= startIdx && nowIdx <= endIdx) {
      return {
        startYear: y,
        windowStart: dateAtLocalMidnight(y, wsm, wsd),
        windowEnd: dateAtLocalMidnight(endYear, wem, wed),
        startIdx,
        endIdx,
      };
    }
  }
  return null;
}

/** Age in whole years from a birth year (year granularity — only birthYear is stored). */
export function ageFromBirthYear(birthYear: number | null, nowYear: number): number | null {
  if (!birthYear) return null;
  return nowYear - birthYear;
}
