// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { nowYear, parseYmd, ymdInZone } from "../dates.ts";

export type CalendarMonth = {
  year: number;
  /** 0-based month. */
  month: number;
};

/** Calendar year and month for `now` in `timeZone`. */
export function calendarMonth(timeZone: string, now: Date = new Date()): CalendarMonth {
  const today = parseYmd(ymdInZone(now, timeZone));
  if (!today) return { year: nowYear(timeZone), month: 0 };
  return { year: today.y, month: today.m - 1 };
}

/**
 * True when `monthIndex` is after the current month of `viewYear`.
 * A later year is entirely future. An earlier year is not.
 */
export function isFutureMonth(
  viewYear: number,
  monthIndex: number,
  timeZone: string,
  now: Date = new Date(),
): boolean {
  const today = calendarMonth(timeZone, now);
  if (viewYear > today.year) return true;
  if (viewYear < today.year) return false;
  return monthIndex > today.month;
}

/**
 * Peak of the per-month sums.
 * Stacked columns use this so a month's segments cannot exceed the plot.
 * An empty or all-zero series scales to 1.
 */
export function stackedMonthPeak(series: readonly (readonly number[])[]): number {
  const months = Math.max(0, ...series.map((values) => values.length));
  let peak = 0;
  for (let month = 0; month < months; month++) {
    let sum = 0;
    for (const values of series) sum += values[month] ?? 0;
    if (sum > peak) peak = sum;
  }
  return peak > 0 ? peak : 1;
}
