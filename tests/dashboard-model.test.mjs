import test from "node:test";
import assert from "node:assert/strict";
import {
  averagePerSession,
  barHeights,
  buildDashboardModel,
  formatCompactKg,
  formatKg,
  splitHoursMinutes,
} from "../src/core/dashboard.ts";
import { parseSetTable } from "../src/core/set-table.ts";
import { minutesByMonthForYear, parseTimeLog } from "../src/core/hobby.ts";
import { DEFAULT_ACTIVITY_TYPES } from "../src/types.ts";

const [GYM, GOLF, READING] = DEFAULT_ACTIVITY_TYPES;

function session(activityId, date, extra = {}) {
  return {
    path: `atomics/exercise/${activityId}/${date.slice(0, 4)}/${date}.md`,
    basename: date,
    date,
    duration_min: 45,
    weight_unit: "kg",
    focus: [],
    felt: "",
    ...extra,
  };
}

const SET_TABLE = `| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Squat | Quads | 100 | 5 | |
| Bench | Chest | 80 | 5 | |
| Row | Back | BW | 10 | |
`;

function fixture() {
  const setRows = parseSetTable(SET_TABLE);
  return {
    year: 2026,
    exercise: [
      {
        activity: GYM,
        sessions: [
          { meta: session("Gym", "2026-01-10", { duration_min: 50 }), setRows },
          { meta: session("Gym", "2026-03-02", { duration_min: 40 }), setRows },
          { meta: session("Gym", "2026-03-15", { duration_min: 60 }), setRows: [] },
        ],
      },
      {
        activity: GOLF,
        sessions: [
          {
            meta: session("Golf", "2026-02-01", {
              duration_min: 90,
              felt: "Good",
              focus: ["Tempo", "Putting"],
            }),
            setRows: [],
          },
          {
            meta: session("Golf", "2026-03-20", {
              duration_min: 80,
              felt: "bad",
              focus: ["Tempo"],
            }),
            setRows: [],
          },
          {
            meta: session("Golf", "2026-04-05", { duration_min: 70, felt: "meh" }),
            setRows: [],
          },
        ],
      },
    ],
    hobbies: [
      {
        activity: READING,
        items: [
          {
            path: "atomics/hobbies/Reading/Items/A.md",
            frontmatter: { status: "reading" },
            entries: parseTimeLog(
              "## Time log\n\n- 2026-01-03 | 30 min | a\n- 2026-01-20 | 15 min | b\n- 2025-12-31 | 99 min | old\n",
            ),
          },
          {
            path: "atomics/hobbies/Reading/Items/B.md",
            frontmatter: { status: "finished" },
            entries: parseTimeLog("## Time log\n\n- 2026-05-01 | 25 min | c\n"),
          },
        ],
      },
    ],
  };
}

test("buildDashboardModel totals sessions, minutes, and volume", () => {
  const model = buildDashboardModel(fixture());
  assert.equal(model.year, 2026);
  assert.equal(model.totalSessions, 6);
  assert.equal(model.totalExerciseMinutes, 50 + 40 + 60 + 90 + 80 + 70);
  // Two gym sessions with a set table: (100*5 + 80*5) each; BW rows add no volume.
  assert.equal(model.totalVolumeKg, 900 * 2);
  assert.equal(model.totalHabitMinutes, 30 + 15 + 25);
  assert.equal(model.firstDate, "2026-01-10");
  assert.equal(model.lastDate, "2026-04-05");
  assert.deepEqual(model.sessionsByMonth, [1, 1, 3, 1, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.deepEqual(model.volumeByMonth.slice(0, 4), [900, 0, 900, 0]);
});

test("buildDashboardModel builds one card per activity with domain-specific fields", () => {
  const model = buildDashboardModel(fixture());
  assert.deepEqual(
    model.activities.map((card) => card.activity.id),
    ["gym", "golf", "reading"],
  );
  const [gym, golf, reading] = model.activities;

  assert.equal(gym.domain, "exercise");
  assert.equal(gym.count, 3);
  assert.equal(gym.minutes, 150);
  assert.equal(gym.volumeKg, 1800);
  assert.deepEqual(gym.monthly, [1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal(gym.lastDate, "2026-03-15");
  assert.equal(gym.felt, null);
  assert.equal("inProgress" in gym, false);

  assert.equal(golf.volumeKg, null);
  assert.deepEqual(golf.felt, { good: 1, ok: 0, bad: 1 });
  assert.equal(golf.lastDate, "2026-04-05");

  assert.equal(reading.domain, "hobby");
  assert.equal(reading.count, 2);
  assert.equal(reading.minutes, 70);
  assert.equal(reading.inProgress, 1);
  assert.deepEqual(reading.monthly, [45, 0, 0, 0, 25, 0, 0, 0, 0, 0, 0, 0]);
  assert.equal("lastDate" in reading, false);
  assert.equal("felt" in reading, false);
});

test("buildDashboardModel emits monthly table columns per activity kind", () => {
  const model = buildDashboardModel(fixture());
  assert.deepEqual(
    model.monthlyColumns.map((column) => `${column.activity.id}:${column.kind}`),
    ["gym:sessions", "gym:volume", "golf:sessions", "reading:minutes"],
  );
});

test("buildDashboardModel ranks muscles by volume then sets under the set-table activity", () => {
  const model = buildDashboardModel(fixture());
  assert.equal(model.muscles.activity.id, "gym");
  assert.deepEqual(model.muscles.rows, [
    { muscle: "Quads", sets: 2, volumeKg: 1000 },
    { muscle: "Chest", sets: 2, volumeKg: 800 },
    { muscle: "Back", sets: 2, volumeKg: 0 },
  ]);
});

test("buildDashboardModel counts golf focus tags and normalizes felt", () => {
  const model = buildDashboardModel(fixture());
  assert.equal(model.golfFocus.activity.id, "golf");
  assert.equal(model.golfFocus.sessions, 3);
  assert.deepEqual(model.golfFocus.tags, [
    { tag: "Tempo", count: 2 },
    { tag: "Putting", count: 1 },
  ]);
  const golfRows = model.recent.filter((row) => row.activity.id === "golf");
  assert.deepEqual(
    golfRows.map((row) => row.felt),
    [null, "bad", "good"],
  );
});

test("buildDashboardModel lists recent sessions newest first with per-session summary", () => {
  const model = buildDashboardModel(fixture());
  assert.deepEqual(
    model.recent.map((row) => row.date),
    ["2026-04-05", "2026-03-20", "2026-03-15", "2026-03-02", "2026-02-01", "2026-01-10"],
  );
  const gymWithRows = model.recent.find((row) => row.date === "2026-03-02");
  assert.equal(gymWithRows.volumeKg, 900);
  assert.equal(gymWithRows.minutes, 40);
  const gymNoRows = model.recent.find((row) => row.date === "2026-03-15");
  assert.equal(gymNoRows.volumeKg, 0);
  const golf = model.recent.find((row) => row.date === "2026-02-01");
  assert.equal(golf.volumeKg, null);
});

test("buildDashboardModel caps recent sessions at ten", () => {
  const sessions = Array.from({ length: 14 }, (_, i) => ({
    meta: session("Golf", `2026-06-${String(i + 1).padStart(2, "0")}`),
    setRows: [],
  }));
  const model = buildDashboardModel({
    year: 2026,
    exercise: [{ activity: GOLF, sessions }],
    hobbies: [],
  });
  assert.equal(model.recent.length, 10);
  assert.equal(model.recent[0].date, "2026-06-14");
  assert.equal(model.totalHabitMinutes, null);
});

test("buildDashboardModel buckets set rows without a muscle under an empty name", () => {
  const rows = parseSetTable(
    "| Exercise | Muscle | Weight | Reps | Notes |\n| --- | --- | --- | --- | --- |\n| Carry | | 40 | 10 | |\n",
  );
  const model = buildDashboardModel({
    year: 2026,
    exercise: [
      { activity: GYM, sessions: [{ meta: session("Gym", "2026-02-02"), setRows: rows }] },
    ],
    hobbies: [],
  });
  assert.deepEqual(model.muscles.rows, [{ muscle: "", sets: 0, volumeKg: 400 }]);
});

test("buildDashboardModel only counts reading-now for the reading habit", () => {
  const chess = { ...READING, id: "chess", label: "Chess" };
  const model = buildDashboardModel({
    year: 2026,
    exercise: [],
    hobbies: [
      { activity: chess, items: [{ path: "c.md", frontmatter: { status: "reading" }, entries: [] }] },
    ],
  });
  assert.equal(model.activities[0].domain, "hobby");
  assert.equal(model.activities[0].inProgress, null);
  assert.equal(model.totalHabitMinutes, 0);
  assert.equal(model.totalVolumeKg, null);
  assert.equal(model.muscles, null);
});

test("buildDashboardModel hides volume, muscles, and golf sections when not applicable", () => {
  const model = buildDashboardModel({
    year: 2026,
    exercise: [{ activity: { ...GYM, supportsSetTable: false }, sessions: [] }],
    hobbies: [],
  });
  assert.equal(model.totalVolumeKg, null);
  assert.equal(model.muscles, null);
  assert.equal(model.golfFocus, null);
  assert.equal(model.firstDate, null);
  assert.equal(model.recent.length, 0);
  assert.equal(model.activities[0].volumeKg, null);
});

test("buildDashboardModel ignores sessions without a date for month buckets", () => {
  const model = buildDashboardModel({
    year: 2026,
    exercise: [
      {
        activity: GOLF,
        sessions: [{ meta: session("Golf", "2026-01-01", { date: null }), setRows: [] }],
      },
    ],
    hobbies: [],
  });
  assert.equal(model.totalSessions, 1);
  assert.deepEqual(model.sessionsByMonth, Array(12).fill(0));
  assert.equal(model.recent.length, 0);
});

test("minutesByMonthForYear buckets time-log minutes by month for one year", () => {
  const entries = parseTimeLog(
    "## Time log\n\n- 2026-01-03 | 30 min | a\n- 2026-01-20 | 15 min | b\n- 2026-12-31 | 5 min | c\n- 2025-12-31 | 99 min | old\n",
  );
  assert.deepEqual(minutesByMonthForYear(entries, 2026), [45, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5]);
  assert.deepEqual(minutesByMonthForYear(entries, 2024), Array(12).fill(0));
});

test("splitHoursMinutes and averagePerSession round the way the KPI cards show them", () => {
  assert.deepEqual(splitHoursMinutes(12898), { hours: 214, minutes: 58 });
  assert.deepEqual(splitHoursMinutes(0), { hours: 0, minutes: 0 });
  assert.equal(averagePerSession(12898, 192), 67);
  assert.equal(averagePerSession(10, 0), 0);
});

test("formatKg and formatCompactKg", () => {
  assert.equal(formatKg(84480), "84,480");
  assert.equal(formatKg(12.345), "12.3");
  assert.equal(formatCompactKg(84480), "84.5k");
  assert.equal(formatCompactKg(900), "900");
});

test("barHeights scales to the max with a visible floor for non-zero values", () => {
  assert.deepEqual(barHeights([0, 0]), [0, 0]);
  assert.deepEqual(barHeights([13, 0, 7, 1]), [100, 0, 54, 8]);
});
