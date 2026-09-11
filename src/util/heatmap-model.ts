// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { durationToLevel } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { addDays, formatYmd, fullDateForLanguage, monthShortForLanguage, weekdaySun0 } from "../dates.ts";
import type { Language } from "../i18n/types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { EMPTY_CELL, type ActivityType, type DayActivity } from "../types.ts";
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
  y: number;
  m: number;
  d: number;
};

export type HeatmapMonthSlot =
  | { kind: "label"; text: string; month: number }
  | { kind: "spacer"; month: number | null };

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
    sameList(previous.maps, next.maps)
  );
}

export type BookShelfPaintState = {
  files: readonly unknown[];
  activityId: string;
  hasActivity: boolean;
  scale: number;
  language: Language;
  statuses: readonly string[] | null;
  invalidStatuses: readonly string[];
};

export function sameBookShelfPaintState(
  previous: BookShelfPaintState | undefined,
  next: BookShelfPaintState,
): boolean {
  if (!previous) return false;
  return (
    previous.files === next.files &&
    previous.activityId === next.activityId &&
    previous.hasActivity === next.hasActivity &&
    previous.scale === next.scale &&
    previous.language === next.language &&
    sameList(previous.statuses, next.statuses) &&
    sameList(previous.invalidStatuses, next.invalidStatuses)
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

/** One slot per week so month headers stay on the same column as the grid. */
export function heatmapMonthSlots(
  weeks: Array<Array<{ y: number; m: number; d: number }>>,
  language: Language,
): HeatmapMonthSlot[] {
  const slots: HeatmapMonthSlot[] = [];
  let lastName = "";
  let lastMonth: number | null = null;
  for (const week of weeks) {
    if (!week.length) {
      slots.push({ kind: "spacer", month: lastMonth });
      continue;
    }
    const first = week[0];
    const name = monthShortForLanguage(first.y, first.m, first.d, language);
    if (name !== lastName && first.d <= 7) {
      slots.push({ kind: "label", text: name, month: first.m });
      lastName = name;
      lastMonth = first.m;
    } else {
      slots.push({ kind: "spacer", month: lastMonth });
    }
  }
  return slots;
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
  for (const week of weeks) {
    const isTodayWeek = week.some((day) => day.isToday && day.isCurrentYear);
    const weekEl = parent.createDiv({
      cls: isTodayWeek ? "fitness-week is-today-week" : "fitness-week",
    });
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
      if (day.path) attr["data-path"] = day.path;
      const cell = weekEl.createDiv({ cls: cellClass(day), attr });
      cell.style.backgroundColor = day.isCurrentYear
        ? colorForLevel(colors, day.level)
        : EMPTY_CELL;
    }
  }
  parent.createDiv({ cls: "fitness-weeks-end-pad" });
}

function colorForLevel(colors: readonly string[], level: number): string {
  if (!level) return EMPTY_CELL;
  return colors[level - 1] || colors[colors.length - 1] || EMPTY_CELL;
}

function cellClass(day: HeatmapDayCell): string {
  let cls = "fitness-cell";
  if (day.isToday) cls += " is-today";
  if (!day.isCurrentYear) cls += " is-faded";
  if (day.path) cls += " is-link";
  return cls;
}
