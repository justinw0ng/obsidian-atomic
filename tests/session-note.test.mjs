import test from "node:test";
import assert from "node:assert/strict";
import { GREEN } from "../src/types.ts";
import { genericExerciseBody, golfBody, gymBody } from "../src/core/session-note.ts";
import { defaultAtomicBlockFence } from "../src/util/codeblock-defaults.ts";

function activity(overrides) {
  return {
    id: "gym",
    domain: "exercise",
    label: "Gym",
    folder: "atomics/exercise/Gym",
    enabled: true,
    baseColor: GREEN[2],
    colors: GREEN,
    noteModel: "dailySession",
    supportsCues: true,
    supportsTimer: false,
    supportsSetTable: true,
    ...overrides,
  };
}

test("gymBody writes frontmatter, muscle hints, gym-log fence, and reminders", () => {
  const markdown = gymBody(
    activity({ supportsSetTable: true }),
    "2026-08-11",
    "Home",
    "garage",
    "kg",
    "en",
  );
  assert.match(markdown, /^---\n/);
  assert.match(markdown, /type: session\n/);
  assert.match(markdown, /date: 2026-08-11\n/);
  assert.match(markdown, /activity: "gym"\n/);
  assert.match(markdown, /location: "Home"\n/);
  assert.match(markdown, /location_detail: "garage"\n/);
  assert.match(markdown, /weight_unit: kg\n/);
  assert.match(
    markdown,
    /<!-- 💪 Muscles: Chest, Back, Shoulders, Biceps, Triceps, Quads, Hamstrings, Glutes, Calves, Core -->/,
  );
  assert.ok(markdown.includes(defaultAtomicBlockFence("atomic-gym-log", "en")));
  assert.match(
    markdown,
    /\| Exercise \| Muscle \| Weight \| Reps \| Notes \|/,
  );
  assert.match(markdown, /## 💡 Reminders\n/);
});

test("gymBody omits reminders when cues are disabled", () => {
  const markdown = gymBody(
    activity({ supportsCues: false }),
    "2026-08-11",
    "Home",
    "",
    "lb",
    "en",
  );
  assert.match(markdown, /weight_unit: lb\n/);
  assert.doesNotMatch(markdown, /Reminders/);
});

test("golfBody writes golf hints and reminders", () => {
  const markdown = golfBody(
    activity({ id: "golf", label: "Golf", supportsSetTable: false }),
    "2026-08-11",
    "en",
  );
  assert.match(markdown, /activity: "golf"\n/);
  assert.match(markdown, /focus: \[\]\n/);
  assert.match(markdown, /club: \[\]\n/);
  assert.match(markdown, /<!-- 📍 location:/);
  assert.match(markdown, /## 💡 Reminders\n/);
});

test("genericExerciseBody writes a daily session without a set table", () => {
  const markdown = genericExerciseBody(
    activity({
      id: "run",
      label: "Run",
      supportsSetTable: false,
      supportsCues: false,
    }),
    "2026-08-11",
    "en",
  );
  assert.match(markdown, /activity: "run"\n/);
  assert.match(markdown, /# Run — 2026-08-11\n/);
  assert.doesNotMatch(markdown, /atomic-gym-log/);
  assert.doesNotMatch(markdown, /Reminders/);
});
