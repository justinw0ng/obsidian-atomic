/** Pure dashboard model. No Obsidian imports; the view only lays this out. */

import type { SetRow } from "./set-table";
import type { Language } from "../i18n/types";
import type { ActivityType, SessionMeta } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { rowVolumeKg } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { monthIndexFromDate } from "../dates.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { minutesByMonthForYear, type TimeLogEntry } from "./hobby.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isInProgressStatus } from "./reading-status.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { activityPaintKey } from "../util/activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { sameList } from "../util/paint-memo.ts";

export type DashboardSessionInput = {
  meta: SessionMeta;
  /** Parsed set table for `supportsSetTable` activities; empty otherwise. */
  setRows: readonly SetRow[];
};

export type DashboardExerciseInput = {
  activity: ActivityType;
  sessions: DashboardSessionInput[];
};

export type DashboardHobbyItemInput = {
  path: string;
  frontmatter: Record<string, unknown>;
  entries: readonly TimeLogEntry[];
};

export type DashboardHobbyInput = {
  activity: ActivityType;
  items: DashboardHobbyItemInput[];
};

export type DashboardInput = {
  year: number;
  exercise: DashboardExerciseInput[];
  hobbies: DashboardHobbyInput[];
};

/**
 * What the last paint was built from. Session metas, set rows, item
 * frontmatter, and Time log entries come from mtime / folder-scoped caches, so
 * reference identity means "unchanged". Activities are snapshotted as keys
 * because settings mutate them in place.
 */
export type DashboardPaintState = {
  year: number;
  language: Language;
  exercise: Array<{ activityKey: string; sessions: readonly DashboardSessionInput[] }>;
  hobbies: Array<{ activityKey: string; items: readonly DashboardHobbyItemInput[] }>;
};

// Compile-time guard: adding a field to an input type fails typecheck here
// (TS2344) until the paint state / comparators below account for it.
type Assert<T extends true> = T;
type FieldsCovered<T, Listed extends keyof T> = [Exclude<keyof T, Listed>] extends [never]
  ? true
  : false;
type SessionInputCovered = Assert<FieldsCovered<DashboardSessionInput, "meta" | "setRows">>;
type HobbyItemInputCovered = Assert<
  FieldsCovered<DashboardHobbyItemInput, "path" | "frontmatter" | "entries">
>;
type DashboardInputCovered = Assert<FieldsCovered<DashboardInput, "year" | "exercise" | "hobbies">>;

export function dashboardPaintState(
  input: DashboardInput,
  language: Language,
): DashboardPaintState {
  return {
    year: input.year,
    language,
    exercise: input.exercise.map(({ activity, sessions }) => ({
      activityKey: activityPaintKey(activity),
      sessions,
    })),
    hobbies: input.hobbies.map(({ activity, items }) => ({
      activityKey: activityPaintKey(activity),
      items,
    })),
  };
}

function sameSessionInput(a: DashboardSessionInput, b: DashboardSessionInput): boolean {
  return a.meta === b.meta && a.setRows === b.setRows;
}

function sameHobbyItemInput(a: DashboardHobbyItemInput, b: DashboardHobbyItemInput): boolean {
  return a.path === b.path && a.frontmatter === b.frontmatter && a.entries === b.entries;
}

/** True when a repaint would produce the same dashboard as the previous one. */
export function sameDashboardPaintState(
  previous: DashboardPaintState | undefined,
  next: DashboardPaintState,
): boolean {
  if (!previous) return false;
  return (
    previous.year === next.year &&
    previous.language === next.language &&
    sameList(
      previous.exercise,
      next.exercise,
      (a, b) => a.activityKey === b.activityKey && sameList(a.sessions, b.sessions, sameSessionInput),
    ) &&
    sameList(
      previous.hobbies,
      next.hobbies,
      (a, b) => a.activityKey === b.activityKey && sameList(a.items, b.items, sameHobbyItemInput),
    )
  );
}

export type Felt = "good" | "ok" | "bad";
export type FeltCounts = Record<Felt, number>;
export const FELT_ORDER: readonly Felt[] = ["good", "ok", "bad"];

type DashboardCardBase = {
  activity: ActivityType;
  /** Sessions for exercise, items for hobbies. */
  count: number;
  minutes: number;
  /** Sessions per month (exercise) or timer minutes per month (hobby). */
  monthly: number[];
};

export type DashboardExerciseCard = DashboardCardBase & {
  domain: "exercise";
  /** Session minutes per month; drives the activity-card bars. */
  monthlyMinutes: number[];
  /** Null unless the activity supports a set table. */
  volumeKg: number | null;
  lastDate: string | null;
  /** Golf only. */
  felt: FeltCounts | null;
};

export type DashboardHobbyCard = DashboardCardBase & {
  domain: "hobby";
  /** Reading only: items whose `status` is `reading`. */
  inProgress: number | null;
};

export type DashboardActivityCard = DashboardExerciseCard | DashboardHobbyCard;

export type DashboardMonthlyColumn = {
  activity: ActivityType;
  kind: "sessions" | "volume" | "minutes";
  values: number[];
};

export type DashboardMuscleRow = {
  /** Empty when set rows carried volume without a muscle. */
  muscle: string;
  sets: number;
  volumeKg: number;
};

export type DashboardFocusTag = { tag: string; count: number };

export type DashboardMuscles = { activity: ActivityType; rows: DashboardMuscleRow[] };

export type DashboardGolfFocus = {
  activity: ActivityType;
  sessions: number;
  tags: DashboardFocusTag[];
};

export type DashboardRecentRow = {
  date: string;
  activity: ActivityType;
  path: string;
  minutes: number;
  volumeKg: number | null;
  felt: Felt | null;
};

export type DashboardModel = {
  year: number;
  totalSessions: number;
  totalExerciseMinutes: number;
  /** Null when no enabled exercise activity supports a set table. */
  totalVolumeKg: number | null;
  /** Null when no hobby activity is enabled. */
  totalHabitMinutes: number | null;
  sessionsByMonth: number[];
  volumeByMonth: number[];
  firstDate: string | null;
  lastDate: string | null;
  activities: DashboardActivityCard[];
  monthlyColumns: DashboardMonthlyColumn[];
  /** Null when no enabled exercise activity supports a set table. */
  muscles: DashboardMuscles | null;
  /** Null when golf is not enabled. */
  golfFocus: DashboardGolfFocus | null;
  recent: DashboardRecentRow[];
};

const RECENT_LIMIT = 10;
const GOLF_ID = "golf";
const READING_ID = "reading";

function emptyMonths(): number[] {
  return Array(12).fill(0) as number[];
}

function addMonths(target: number[], source: number[]): void {
  for (let i = 0; i < 12; i++) target[i] += source[i];
}

function bump(map: Map<string, number>, key: string, by: number): void {
  map.set(key, (map.get(key) || 0) + by);
}

export function formatKg(n: number): string {
  return (Math.round(n * 10) / 10).toLocaleString("en-US");
}

/** `84480` → `84.5k`; below 1000 falls back to `formatKg`. */
export function formatCompactKg(n: number): string {
  if (n < 1000) return formatKg(n);
  const k = n / 1000;
  return `${(Math.round(k * 10) / 10).toLocaleString("en-US")}k`;
}

export function splitHoursMinutes(totalMinutes: number): { hours: number; minutes: number } {
  const safe = Math.max(0, Math.round(totalMinutes));
  return { hours: Math.floor(safe / 60), minutes: safe % 60 };
}

export function averagePerSession(totalMinutes: number, sessions: number): number {
  return sessions > 0 ? Math.round(totalMinutes / sessions) : 0;
}

/** One decimal hour, for activity-card bar labels (`75` → `1.3`). */
export function hoursFromMinutes(minutes: number): number {
  return Math.round((minutes / 60) * 10) / 10;
}

export function formatHours(minutes: number): string {
  return `${hoursFromMinutes(minutes).toLocaleString("en-US")}h`;
}

/**
 * Scale a series to percentages of its max so bars can be drawn without a
 * chart lib. Zero values always map to 0; non-zero values are floored at
 * `minPercent` so tiny bars stay visible (raise it for short containers).
 */
export function barHeights(values: number[], minPercent = 4): number[] {
  const max = Math.max(0, ...values);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) =>
    v <= 0 ? 0 : Math.max(minPercent, Math.round((v / max) * 100)),
  );
}

function normalizeFelt(felt: unknown): Felt | null {
  const value = String(felt || "").toLowerCase();
  return value === "good" || value === "ok" || value === "bad" ? value : null;
}

type ExerciseSummary = {
  card: DashboardExerciseCard;
  columns: DashboardMonthlyColumn[];
  /** Null unless the activity supports a set table. */
  monthlyVolume: number[] | null;
  recent: DashboardRecentRow[];
  muscleSets: Map<string, number>;
  muscleVolume: Map<string, number>;
  focusCounts: Map<string, number>;
};

function summarizeExercise({ activity, sessions }: DashboardExerciseInput): ExerciseSummary {
  const monthly = emptyMonths();
  const monthlyMinutes = emptyMonths();
  const monthlyVolume = emptyMonths();
  const felt: FeltCounts = { good: 0, ok: 0, bad: 0 };
  const muscleSets = new Map<string, number>();
  const muscleVolume = new Map<string, number>();
  const focusCounts = new Map<string, number>();
  const recent: DashboardRecentRow[] = [];
  const isGolf = activity.id === GOLF_ID;
  let minutes = 0;
  let volumeKg = 0;
  let lastDate: string | null = null;

  for (const { meta, setRows } of sessions) {
    const mi = monthIndexFromDate(meta.date);
    minutes += meta.duration_min;
    if (mi >= 0) {
      monthly[mi] += 1;
      monthlyMinutes[mi] += meta.duration_min;
    }

    let sessionVolume = 0;
    if (activity.supportsSetTable) {
      for (const row of setRows) {
        const vol = rowVolumeKg(row, meta.weight_unit);
        sessionVolume += vol;
        if (row.muscle) bump(muscleSets, row.muscle, 1);
        if (vol > 0) bump(muscleVolume, row.muscle, vol);
      }
      volumeKg += sessionVolume;
      if (mi >= 0) monthlyVolume[mi] += sessionVolume;
    }

    const sessionFelt = isGolf ? normalizeFelt(meta.felt) : null;
    if (isGolf) {
      if (sessionFelt) felt[sessionFelt] += 1;
      for (const focus of meta.focus) bump(focusCounts, focus, 1);
    }

    if (meta.date) {
      if (!lastDate || meta.date > lastDate) lastDate = meta.date;
      recent.push({
        date: meta.date,
        activity,
        path: meta.path,
        minutes: meta.duration_min,
        volumeKg: activity.supportsSetTable ? sessionVolume : null,
        felt: sessionFelt,
      });
    }
  }

  const columns: DashboardMonthlyColumn[] = [{ activity, kind: "sessions", values: monthly }];
  if (activity.supportsSetTable) {
    columns.push({ activity, kind: "volume", values: monthlyVolume });
  }
  return {
    card: {
      domain: "exercise",
      activity,
      count: sessions.length,
      minutes,
      monthly,
      monthlyMinutes,
      volumeKg: activity.supportsSetTable ? volumeKg : null,
      lastDate,
      felt: isGolf ? felt : null,
    },
    columns,
    monthlyVolume: activity.supportsSetTable ? monthlyVolume : null,
    recent,
    muscleSets,
    muscleVolume,
    focusCounts,
  };
}

function summarizeHobby(
  { activity, items }: DashboardHobbyInput,
  year: number,
): { card: DashboardHobbyCard; column: DashboardMonthlyColumn } {
  const monthly = emptyMonths();
  let inProgress = 0;
  for (const item of items) {
    addMonths(monthly, minutesByMonthForYear(item.entries, year));
    if (isInProgressStatus(item.frontmatter.status)) inProgress += 1;
  }
  return {
    card: {
      domain: "hobby",
      activity,
      count: items.length,
      minutes: monthly.reduce((sum, v) => sum + v, 0),
      monthly,
      inProgress: activity.id === READING_ID ? inProgress : null,
    },
    column: { activity, kind: "minutes", values: monthly },
  };
}

function rankMuscles(
  sets: Map<string, number>,
  volume: Map<string, number>,
): DashboardMuscleRow[] {
  const names = new Set([...sets.keys(), ...volume.keys()]);
  return [...names]
    .map((muscle) => ({
      muscle,
      sets: sets.get(muscle) || 0,
      volumeKg: volume.get(muscle) || 0,
    }))
    .sort(
      (a, b) =>
        b.volumeKg - a.volumeKg || b.sets - a.sets || a.muscle.localeCompare(b.muscle),
    );
}

function rankFocus(counts: Map<string, number>): DashboardFocusTag[] {
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

export function buildDashboardModel(input: DashboardInput): DashboardModel {
  const sessionsByMonth = emptyMonths();
  const volumeByMonth = emptyMonths();
  const muscleSets = new Map<string, number>();
  const muscleVolume = new Map<string, number>();
  const focusCounts = new Map<string, number>();
  const recent: DashboardRecentRow[] = [];
  const activities: DashboardActivityCard[] = [];
  const monthlyColumns: DashboardMonthlyColumn[] = [];
  let totalSessions = 0;
  let totalExerciseMinutes = 0;
  let totalVolumeKg = 0;
  let setTableActivity: ActivityType | null = null;
  let golf: DashboardExerciseCard | null = null;

  for (const exercise of input.exercise) {
    const summary = summarizeExercise(exercise);
    const { card } = summary;
    totalSessions += card.count;
    totalExerciseMinutes += card.minutes;
    addMonths(sessionsByMonth, card.monthly);
    if (card.volumeKg != null && summary.monthlyVolume) {
      if (!setTableActivity) setTableActivity = card.activity;
      totalVolumeKg += card.volumeKg;
      addMonths(volumeByMonth, summary.monthlyVolume);
    }
    if (card.activity.id === GOLF_ID) golf = card;
    for (const [k, v] of summary.muscleSets) bump(muscleSets, k, v);
    for (const [k, v] of summary.muscleVolume) bump(muscleVolume, k, v);
    for (const [k, v] of summary.focusCounts) bump(focusCounts, k, v);
    recent.push(...summary.recent);
    activities.push(card);
    monthlyColumns.push(...summary.columns);
  }

  let totalHabitMinutes = 0;
  for (const hobby of input.hobbies) {
    const { card, column } = summarizeHobby(hobby, input.year);
    totalHabitMinutes += card.minutes;
    activities.push(card);
    monthlyColumns.push(column);
  }

  recent.sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path));
  const dates = recent.map((row) => row.date);

  return {
    year: input.year,
    totalSessions,
    totalExerciseMinutes,
    totalVolumeKg: setTableActivity ? totalVolumeKg : null,
    totalHabitMinutes: input.hobbies.length ? totalHabitMinutes : null,
    sessionsByMonth,
    volumeByMonth,
    firstDate: dates.length ? dates[dates.length - 1] : null,
    lastDate: dates.length ? dates[0] : null,
    activities,
    monthlyColumns,
    muscles: setTableActivity
      ? { activity: setTableActivity, rows: rankMuscles(muscleSets, muscleVolume) }
      : null,
    golfFocus: golf
      ? { activity: golf.activity, sessions: golf.count, tags: rankFocus(focusCounts) }
      : null,
    recent: recent.slice(0, RECENT_LIMIT),
  };
}
