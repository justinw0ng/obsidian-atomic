/** Pure dashboard model. No Obsidian imports; the view only lays this out. */

import type { TimeLogEntry } from "./hobby";
import type { SetRow } from "./set-table";
import type { ActivityType, Domain, SessionMeta } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { rowVolumeKg } from "../core.ts";

export type DashboardSessionInput = {
  meta: SessionMeta;
  /** Parsed set table for `supportsSetTable` activities; empty otherwise. */
  setRows: SetRow[];
};

export type DashboardExerciseInput = {
  activity: ActivityType;
  sessions: DashboardSessionInput[];
};

export type DashboardHobbyItemInput = {
  path: string;
  frontmatter: Record<string, unknown>;
  entries: TimeLogEntry[];
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

export type FeltCounts = { good: number; ok: number; bad: number };

export type DashboardActivityCard = {
  activity: ActivityType;
  domain: Domain;
  /** Sessions for exercise, items for hobbies. */
  count: number;
  minutes: number;
  volumeKg: number | null;
  /** Sessions per month (exercise) or timer minutes per month (hobby). */
  monthly: number[];
  lastDate: string | null;
  felt: FeltCounts | null;
  /** Hobby items whose `status` is `reading`; null for exercise cards. */
  inProgress: number | null;
};

export type DashboardMonthlyColumn = {
  activity: ActivityType;
  kind: "sessions" | "volume" | "minutes";
  values: number[];
};

export type DashboardMuscleRow = { muscle: string; sets: number; volumeKg: number };

export type DashboardRecentRow = {
  date: string;
  activity: ActivityType;
  path: string;
  minutes: number;
  volumeKg: number | null;
  felt: string | null;
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
  muscles: DashboardMuscleRow[] | null;
  golfFocus: Array<[string, number]> | null;
  recent: DashboardRecentRow[];
};

export const DASHBOARD_RECENT_LIMIT = 10;

export function monthIndexFromDate(dateStr: string | null | undefined): number {
  const m = String(dateStr || "").match(/^\d{4}-(\d{2})-/);
  if (!m) return -1;
  const index = Number(m[1]) - 1;
  return index >= 0 && index < 12 ? index : -1;
}

export function emptyMonths(): number[] {
  return Array(12).fill(0) as number[];
}

export function sortCountsDesc(map: Map<string, number>): Array<[string, number]> {
  return [...map.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  );
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

/** Scale a series to percentages of its max so bars can be drawn without a chart lib. */
export function barHeights(values: number[]): number[] {
  const max = Math.max(0, ...values);
  if (max <= 0) return values.map(() => 0);
  return values.map((v) => (v <= 0 ? 0 : Math.max(4, Math.round((v / max) * 100))));
}

export function feltShare(felt: FeltCounts): { good: number; ok: number; bad: number } {
  const total = felt.good + felt.ok + felt.bad;
  if (total <= 0) return { good: 0, ok: 0, bad: 0 };
  return {
    good: (felt.good / total) * 100,
    ok: (felt.ok / total) * 100,
    bad: (felt.bad / total) * 100,
  };
}

function isInProgressStatus(frontmatter: Record<string, unknown>): boolean {
  return String(frontmatter.status ?? "").trim().toLowerCase() === "reading";
}

function minutesByMonthForYear(entries: TimeLogEntry[], year: number): number[] {
  const months = emptyMonths();
  const prefix = `${year}-`;
  for (const entry of entries) {
    if (!entry.date.startsWith(prefix)) continue;
    const mi = monthIndexFromDate(entry.date);
    if (mi >= 0) months[mi] += entry.minutes;
  }
  return months;
}

function normalizeFelt(felt: unknown): keyof FeltCounts | null {
  const value = String(felt || "").toLowerCase();
  return value === "good" || value === "ok" || value === "bad" ? value : null;
}

export function buildDashboardModel(input: DashboardInput): DashboardModel {
  const sessionsByMonth = emptyMonths();
  const volumeByMonth = emptyMonths();
  const muscleVolume = new Map<string, number>();
  const muscleSets = new Map<string, number>();
  const focusCounts = new Map<string, number>();
  const recent: DashboardRecentRow[] = [];
  const activities: DashboardActivityCard[] = [];
  const monthlyColumns: DashboardMonthlyColumn[] = [];

  let totalSessions = 0;
  let totalExerciseMinutes = 0;
  let totalVolumeKg = 0;
  let anySetTable = false;
  let anyGolf = false;
  let firstDate: string | null = null;
  let lastDate: string | null = null;

  for (const { activity, sessions } of input.exercise) {
    const monthly = emptyMonths();
    const monthlyVolume = emptyMonths();
    const felt: FeltCounts = { good: 0, ok: 0, bad: 0 };
    let minutes = 0;
    let volumeKg = 0;
    let activityLast: string | null = null;
    const isGolf = activity.id === "golf";
    if (activity.supportsSetTable) anySetTable = true;
    if (isGolf) anyGolf = true;

    for (const { meta, setRows } of sessions) {
      const mi = monthIndexFromDate(meta.date);
      minutes += meta.duration_min;
      if (mi >= 0) {
        monthly[mi] += 1;
        sessionsByMonth[mi] += 1;
      }

      let sessionVolume = 0;
      if (activity.supportsSetTable) {
        for (const row of setRows) {
          const vol = rowVolumeKg(row, meta.weight_unit);
          sessionVolume += vol;
          if (row.muscle) {
            muscleSets.set(row.muscle, (muscleSets.get(row.muscle) || 0) + 1);
          }
          if (vol > 0) {
            const muscle = row.muscle || "Unknown";
            muscleVolume.set(muscle, (muscleVolume.get(muscle) || 0) + vol);
          }
        }
        volumeKg += sessionVolume;
        if (mi >= 0) {
          monthlyVolume[mi] += sessionVolume;
          volumeByMonth[mi] += sessionVolume;
        }
      }

      const feltKey = isGolf ? normalizeFelt(meta.felt) : null;
      if (isGolf) {
        if (feltKey) felt[feltKey] += 1;
        for (const focus of meta.focus) {
          focusCounts.set(focus, (focusCounts.get(focus) || 0) + 1);
        }
      }

      if (meta.date) {
        if (!firstDate || meta.date < firstDate) firstDate = meta.date;
        if (!lastDate || meta.date > lastDate) lastDate = meta.date;
        if (!activityLast || meta.date > activityLast) activityLast = meta.date;
        recent.push({
          date: meta.date,
          activity,
          path: meta.path,
          minutes: meta.duration_min,
          volumeKg: activity.supportsSetTable ? sessionVolume : null,
          felt: feltKey,
        });
      }
    }

    totalSessions += sessions.length;
    totalExerciseMinutes += minutes;
    totalVolumeKg += volumeKg;
    activities.push({
      activity,
      domain: "exercise",
      count: sessions.length,
      minutes,
      volumeKg: activity.supportsSetTable ? volumeKg : null,
      monthly,
      lastDate: activityLast,
      felt: isGolf ? felt : null,
      inProgress: null,
    });
    monthlyColumns.push({ activity, kind: "sessions", values: monthly });
    if (activity.supportsSetTable) {
      monthlyColumns.push({ activity, kind: "volume", values: monthlyVolume });
    }
  }

  let totalHabitMinutes = 0;
  for (const { activity, items } of input.hobbies) {
    const monthly = emptyMonths();
    let inProgress = 0;
    for (const item of items) {
      const perMonth = minutesByMonthForYear(item.entries, input.year);
      for (let i = 0; i < 12; i++) monthly[i] += perMonth[i];
      if (isInProgressStatus(item.frontmatter)) inProgress += 1;
    }
    const minutes = monthly.reduce((sum, v) => sum + v, 0);
    totalHabitMinutes += minutes;
    activities.push({
      activity,
      domain: "hobby",
      count: items.length,
      minutes,
      volumeKg: null,
      monthly,
      lastDate: null,
      felt: null,
      inProgress,
    });
    monthlyColumns.push({ activity, kind: "minutes", values: monthly });
  }

  recent.sort((a, b) => b.date.localeCompare(a.date) || a.path.localeCompare(b.path));

  const muscleNames = new Set([...muscleSets.keys(), ...muscleVolume.keys()]);
  const muscles = [...muscleNames]
    .map((muscle) => ({
      muscle,
      sets: muscleSets.get(muscle) || 0,
      volumeKg: muscleVolume.get(muscle) || 0,
    }))
    .sort(
      (a, b) =>
        b.volumeKg - a.volumeKg || b.sets - a.sets || a.muscle.localeCompare(b.muscle),
    );

  return {
    year: input.year,
    totalSessions,
    totalExerciseMinutes,
    totalVolumeKg: anySetTable ? totalVolumeKg : null,
    totalHabitMinutes: input.hobbies.length ? totalHabitMinutes : null,
    sessionsByMonth,
    volumeByMonth,
    firstDate,
    lastDate,
    activities,
    monthlyColumns,
    muscles: anySetTable ? muscles : null,
    golfFocus: anyGolf ? sortCountsDesc(focusCounts) : null,
    recent: recent.slice(0, DASHBOARD_RECENT_LIMIT),
  };
}
