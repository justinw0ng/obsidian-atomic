// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { durationToLevel } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { addDays, formatYmd, fullDateForLanguage, monthShortForLanguage, weekdaySun0 } from "../dates.ts";
import type { Language } from "../i18n/types";
import type { ActivityType, DayActivity } from "../types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { activityPaintKey } from "./activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { sameList } from "./paint-memo.ts";

export type HeatmapDayCell = {
  date: string;
  minutes: number;
  level: number;
  path: string | null;
  fullDate: string;
  isCurrentYear: boolean;
  isToday: boolean;
  isFuture: boolean;
  y: number;
  m: number;
  d: number;
};

export type HeatmapMonthPlacement = {
  month: number;
  text: string;
  /** 1-based week column, matching `grid-column: var(--w)`. */
  week: number;
};

export type HeatmapPaintState = {
  year: number;
  timezone: string;
  language: Language;
  layoutKey: string;
  activityKey: string;
  invalidIds: string[];
  maps: Array<Map<string, DayActivity>>;
};

export function formatHeatmapTooltip(
  template: string,
  date: string,
  minutes: number,
): string {
  return template
    .split("{date}")
    .join(date)
    .split("{minutes}")
    .join(String(minutes));
}

export function heatmapLayoutKey(layout: {
  rows: number;
  columns: number;
  minColumnWidth: number;
  defaultSpan: number;
}): string {
  return `${layout.rows}:${layout.columns}:${layout.minColumnWidth}:${layout.defaultSpan}`;
}

export function heatmapActivityKey(activities: readonly ActivityType[]): string {
  return activities.map(activityPaintKey).join("|");
}

/** True when two duration maps would paint the same heatmap cells. */
export function sameDurationMap(
  left: Map<string, DayActivity>,
  right: Map<string, DayActivity>,
): boolean {
  if (left === right) return true;
  if (left.size !== right.size) return false;
  for (const [date, entry] of left) {
    const other = right.get(date);
    if (!other || other.minutes !== entry.minutes || other.path !== entry.path) {
      return false;
    }
  }
  return true;
}

export function sameHeatmapPaintState(
  previous: HeatmapPaintState | undefined,
  next: HeatmapPaintState,
): boolean {
  if (!previous) return false;
  return (
    previous.year === next.year &&
    previous.timezone === next.timezone &&
    previous.language === next.language &&
    previous.layoutKey === next.layoutKey &&
    previous.activityKey === next.activityKey &&
    sameList(previous.invalidIds, next.invalidIds) &&
    sameList(previous.maps, next.maps, sameDurationMap)
  );
}

export function buildHeatmapWeeks(params: {
  year: number;
  todayStr: string;
  language: Language;
  activityMap: Map<string, DayActivity>;
}): HeatmapDayCell[][] {
  const { year, todayStr, language, activityMap } = params;
  const start = { y: year, m: 1, d: 1 };
  const end = { y: year, m: 12, d: 31 };
  const daysToSubtract = weekdaySun0(start.y, start.m, start.d);
  let cursor = addDays(start.y, start.m, start.d, -daysToSubtract);

  const weeks: HeatmapDayCell[][] = [];
  let weekCount = 0;
  const endYmd = formatYmd(end.y, end.m, end.d);
  while (weekCount < 60) {
    if (formatYmd(cursor.y, cursor.m, cursor.d) > endYmd) break;
    const week: HeatmapDayCell[] = [];
    for (let i = 0; i < 7; i++) {
      const dateStr = formatYmd(cursor.y, cursor.m, cursor.d);
      const entry = activityMap.get(dateStr);
      const minutes = entry ? entry.minutes : 0;
      week.push({
        date: dateStr,
        minutes,
        level: durationToLevel(minutes),
        path: entry?.path ?? null,
        fullDate: fullDateForLanguage(cursor.y, cursor.m, cursor.d, language),
        isCurrentYear: cursor.y === year,
        isToday: dateStr === todayStr,
        isFuture: cursor.y === year && dateStr > todayStr,
        y: cursor.y,
        m: cursor.m,
        d: cursor.d,
      });
      cursor = addDays(cursor.y, cursor.m, cursor.d, 1);
    }
    weeks.push(week);
    weekCount++;
  }
  return weeks;
}

/**
 * One label per month, on the week column that contains that month's first
 * day. `--w` is 1-based so `grid-column: var(--w) / span 4` lines up with
 * the cell grid.
 */
export function heatmapMonthPlacements(
  weeks: HeatmapDayCell[][],
  language: Language,
): HeatmapMonthPlacement[] {
  const placements: HeatmapMonthPlacement[] = [];
  const seen = new Set<number>();
  let index = 0;
  for (const week of weeks) {
    for (const day of week) {
      if (day.isCurrentYear && !seen.has(day.m)) {
        seen.add(day.m);
        placements.push({
          month: day.m,
          text: monthShortForLanguage(day.y, day.m, day.d, language),
          week: Math.floor(index / 7) + 1,
        });
      }
      index += 1;
    }
  }
  return placements;
}

export type HeatmapPaintHost = {
  createDiv(options?: {
    cls?: string;
    attr?: Record<string, string | number | boolean | null>;
  }): HeatmapPaintHost & { style: { backgroundColor: string } };
};

export function appendHeatmapWeeks(
  parent: HeatmapPaintHost,
  weeks: HeatmapDayCell[][],
  colors: readonly string[],
  tooltip: string,
  tooltipOpen: string,
): void {
  void colors;
  for (const week of weeks) {
    for (const day of week) {
      const attr: Record<string, string> = {
        "data-minutes": String(day.minutes),
        "data-date": day.fullDate,
        "data-ymd": day.date,
        title: formatHeatmapTooltip(
          day.path ? tooltipOpen : tooltip,
          day.fullDate,
          day.minutes,
        ),
      };
      if (day.isToday) attr["data-testid"] = "atomic-heatmap-today";
      if (day.path && day.isCurrentYear && !day.isFuture) attr["data-path"] = day.path;
      if (day.isCurrentYear && !day.isFuture) attr["data-l"] = String(day.level);
      parent.createDiv({ cls: cellClass(day), attr });
    }
  }
}

function cellClass(day: HeatmapDayCell): string {
  if (!day.isCurrentYear) return "atomic-heat-cell is-pad";
  const parts = ["atomic-heat-cell"];
  if (day.isToday) parts.push("is-today");
  if (day.isFuture) parts.push("is-future");
  if (day.path && !day.isFuture) parts.push("is-link");
  return parts.join(" ");
}
