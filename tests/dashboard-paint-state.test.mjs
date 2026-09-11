import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dashboardPaintState,
  sameDashboardPaintState,
} from "../src/core/dashboard.ts";
import { activityPaintKey } from "../src/util/activity-types.ts";
import { DEFAULT_ACTIVITY_TYPES } from "../src/types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function cloneActivity(activity) {
  return { ...activity, colors: [...activity.colors] };
}

function input() {
  const [gym, golf, reading] = DEFAULT_ACTIVITY_TYPES.map(cloneActivity);
  const gymMeta = { path: "atomics/exercise/Gym/2026/2026-01-10.md", date: "2026-01-10" };
  const golfMeta = { path: "atomics/exercise/Golf/2026/2026-02-01.md", date: "2026-02-01" };
  const setRows = [{ exercise: "Squat", muscle: "Quads", weight: "100", reps: "5", notes: "" }];
  const noRows = [];
  const frontmatter = { type: "atomic-item", activity: "reading", status: "reading" };
  const entries = [{ date: "2026-01-05", minutes: 30, note: "" }];
  return {
    activities: { gym, golf, reading },
    refs: { gymMeta, golfMeta, setRows, noRows, frontmatter, entries },
    value: {
      year: 2026,
      exercise: [
        { activity: gym, sessions: [{ meta: gymMeta, setRows }] },
        { activity: golf, sessions: [{ meta: golfMeta, setRows: noRows }] },
      ],
      hobbies: [
        {
          activity: reading,
          items: [{ path: "atomics/hobbies/Reading/Items/Book.md", frontmatter, entries }],
        },
      ],
    },
  };
}

test("dashboard paint-skip treats cache-identical input as unchanged", () => {
  const fixture = input();
  const previous = dashboardPaintState(fixture.value, "en");
  // A fresh collection reuses the cached metas / rows / entries by reference.
  const again = {
    ...fixture.value,
    exercise: fixture.value.exercise.map((e) => ({ ...e, sessions: [...e.sessions] })),
    hobbies: fixture.value.hobbies.map((h) => ({ ...h, items: [...h.items] })),
  };
  assert.equal(sameDashboardPaintState(previous, dashboardPaintState(again, "en")), true);
  assert.equal(sameDashboardPaintState(undefined, previous), false);
});

test("dashboard paint-skip repaints on year, language, or data changes", () => {
  const fixture = input();
  const previous = dashboardPaintState(fixture.value, "en");

  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState({ ...fixture.value, year: 2025 }, "en")),
    false,
    "year",
  );
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(fixture.value, "zh-Hant-en")),
    false,
    "language",
  );

  const editedRows = { ...fixture.value };
  editedRows.exercise = [
    {
      activity: fixture.activities.gym,
      sessions: [{ meta: fixture.refs.gymMeta, setRows: [...fixture.refs.setRows] }],
    },
    fixture.value.exercise[1],
  ];
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(editedRows, "en")),
    false,
    "re-parsed set rows (new reference) repaint",
  );

  const newSession = { ...fixture.value };
  newSession.exercise = [
    {
      activity: fixture.activities.gym,
      sessions: [
        { meta: fixture.refs.gymMeta, setRows: fixture.refs.setRows },
        { meta: { path: "atomics/exercise/Gym/2026/2026-01-11.md", date: "2026-01-11" }, setRows: [] },
      ],
    },
    fixture.value.exercise[1],
  ];
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(newSession, "en")),
    false,
    "added session",
  );

  const relogged = { ...fixture.value };
  relogged.hobbies = [
    {
      activity: fixture.activities.reading,
      items: [
        {
          path: "atomics/hobbies/Reading/Items/Book.md",
          frontmatter: fixture.refs.frontmatter,
          entries: [...fixture.refs.entries],
        },
      ],
    },
  ];
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(relogged, "en")),
    false,
    "re-parsed Time log repaints",
  );

  const disabledHobby = { ...fixture.value, hobbies: [] };
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(disabledHobby, "en")),
    false,
    "hobby disabled",
  );
});

test("dashboard paint-skip sees in-place activity edits from Settings", () => {
  const fixture = input();
  const previous = dashboardPaintState(fixture.value, "en");

  fixture.activities.gym.colors = ["#111111", "#222222", "#333333", "#444444"];
  assert.equal(
    sameDashboardPaintState(previous, dashboardPaintState(fixture.value, "en")),
    false,
    "colors mutated on the same object",
  );

  const relabel = input();
  const before = dashboardPaintState(relabel.value, "en");
  relabel.activities.reading.label = "Books";
  assert.equal(
    sameDashboardPaintState(before, dashboardPaintState(relabel.value, "en")),
    false,
    "label mutated on the same object",
  );
});

test("activityPaintKey covers every rendered ActivityType field", () => {
  const base = cloneActivity(DEFAULT_ACTIVITY_TYPES[0]);
  const key = activityPaintKey(base);
  assert.equal(activityPaintKey(cloneActivity(base)), key);
  for (const [field, value] of [
    ["id", "other"],
    ["domain", "hobby"],
    ["label", "Other"],
    ["folder", "atomics/exercise/Other"],
    ["enabled", false],
    ["baseColor", "#123456"],
    ["noteModel", "item"],
    ["supportsCues", false],
    ["supportsTimer", true],
    ["supportsSetTable", false],
    ["colors", ["#1", "#2", "#3", "#4"]],
  ]) {
    const changed = cloneActivity(base);
    changed[field] = value;
    assert.notEqual(activityPaintKey(changed), key, field);
  }
  // Guard against a new ActivityType field silently escaping the paint-skip.
  const typeSource = readFileSync(join(root, "src/types.ts"), "utf8");
  const interfaceBlock = typeSource.match(/export interface ActivityType \{([\s\S]*?)\n\}/);
  assert.ok(interfaceBlock, "ActivityType interface not found");
  const fields = [...interfaceBlock[1].matchAll(/^\s{2}(\w+):/gm)].map((m) => m[1]);
  assert.ok(fields.length >= 10);
  const keySource = readFileSync(join(root, "src/util/activity-types.ts"), "utf8");
  const keyBody = keySource.slice(keySource.indexOf("export function activityPaintKey"));
  for (const field of fields) {
    assert.match(keyBody, new RegExp(`activity\\.${field}\\b`), `activityPaintKey misses ${field}`);
  }
});

test("dashboard view collects cached set rows and skips identical repaints", () => {
  const view = readFileSync(join(root, "src/views/dashboard.ts"), "utf8");
  assert.match(view, /data\.getSessionSetRows\(meta\.path\)/);
  assert.doesNotMatch(view, /readBody/);
  assert.doesNotMatch(view, /parseSetTable/);
  assert.match(view, /dashboardDomIsPainted\(el\)/);
  assert.match(view, /sameDashboardPaintState\(paintStates\.get\(el\), paintState\)/);
  assert.match(view, /paintStates\.set\(el, paintState\)/);
});
