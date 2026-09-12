import test from "node:test";
import assert from "node:assert/strict";
import {
  LB_TO_KG,
  durationToLevel,
  isLoadedWeight,
  toKg,
  rowVolumeKg,
  parseSetTable,
  yearFromDailyPath,
} from "../src/core.ts";

test("exports expected helpers", () => {
  assert.equal(typeof durationToLevel, "function");
  assert.equal(typeof isLoadedWeight, "function");
  assert.equal(typeof toKg, "function");
  assert.equal(typeof rowVolumeKg, "function");
  assert.equal(typeof parseSetTable, "function");
  assert.equal(typeof yearFromDailyPath, "function");
});

test("isLoadedWeight rejects BW and empties", () => {
  assert.equal(isLoadedWeight("BW"), false);
  assert.equal(isLoadedWeight("—"), false);
  assert.equal(isLoadedWeight("-"), false);
  assert.equal(isLoadedWeight(""), false);
  assert.equal(isLoadedWeight(null), false);
  assert.equal(isLoadedWeight(60), true);
  assert.equal(isLoadedWeight("60"), true);
  assert.equal(isLoadedWeight("60.5"), true);
});

test("toKg converts lb", () => {
  assert.equal(toKg(100, "kg"), 100);
  assert.ok(Math.abs(toKg(100, "lb") - 100 * LB_TO_KG) < 1e-9);
});

test("rowVolumeKg skips non-loaded", () => {
  assert.equal(rowVolumeKg({ weight: "BW", reps: 10 }, "kg"), 0);
  assert.equal(rowVolumeKg({ weight: 60, reps: 8 }, "kg"), 480);
  assert.ok(Math.abs(rowVolumeKg({ weight: 100, reps: 5 }, "lb") - 500 * LB_TO_KG) < 1e-6);
});

test("parseSetTable reads rows", () => {
  const md = `
| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Bench | Chest | 60 | 8 | |
| Pull-up | Back | BW | 6 | warmup |
`;
  const rows = parseSetTable(md);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].exercise, "Bench");
  assert.equal(rows[0].muscle, "Chest");
  assert.equal(rows[0].weight, "60");
  assert.equal(rows[0].reps, "8");
  assert.equal(rows[1].weight, "BW");
});

test("parseSetTable keeps empty data rows and stops at the first non-table line", () => {
  const md = `# Gym
| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Bench | Chest | 60 | 8 | |
|  |  |  |  |  |
| Pull-up | Back | BW | 6 | warmup |

## Reminders
| Exercise | Muscle | Weight | Reps | Notes |
| --- | --- | --- | --- | --- |
| Ignored | Core | 10 | 10 | |
`;
  const rows = parseSetTable(md);
  assert.equal(rows.length, 3);
  assert.equal(rows[1].exercise, "");
  assert.equal(rows[2].exercise, "Pull-up");
});

test("durationToLevel buckets", () => {
  assert.equal(durationToLevel(0), 0);
  assert.equal(durationToLevel(null), 0);
  assert.equal(durationToLevel(15), 1);
  assert.equal(durationToLevel(30), 2);
  assert.equal(durationToLevel(60), 3);
  assert.equal(durationToLevel(90), 4);
});

test("yearFromDailyPath", () => {
  assert.equal(
    yearFromDailyPath("Daily/2025/Jun/2025-06-10.md", 2026),
    2025,
  );
  assert.equal(yearFromDailyPath("Inbox/note.md", 2026), 2026);
});

