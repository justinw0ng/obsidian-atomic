import test from "node:test";
import assert from "node:assert/strict";
import {
  dedicatedCueHostPaths,
  rewriteDedicatedCueFences,
} from "../src/util/rewrite-cue-fences.ts";
import { DEFAULT_SETTINGS } from "../src/types.ts";
import { createExerciseActivityType } from "../src/util/activity-types.ts";

test("rewriteDedicatedCueFences rewrites language and inserts activity", () => {
  const input = `# Cues\n\nUse atomic-golf-cues in prose.\n\n\`\`\`atomic-golf-cues\nyear: 2026\n\`\`\`\n`;
  const markdown = rewriteDedicatedCueFences(input);
  assert.match(markdown, /```atomic-cues\nactivity: golf\nyear: 2026\n```/);
  assert.match(markdown, /Use atomic-golf-cues in prose/);
  assert.doesNotMatch(markdown, /```atomic-golf-cues\b/);
});

test("rewriteDedicatedCueFences is idempotent for atomic-cues", () => {
  const input = "```atomic-cues\nactivity: golf\n```\n";
  assert.equal(rewriteDedicatedCueFences(input), input);
});

test("rewriteDedicatedCueFences handles tildes, info strings, and empty bodies", () => {
  const input = "~~~atomic-golf-cues extra\n~~~\n```atomic-gym-cues\n```\n";
  const markdown = rewriteDedicatedCueFences(input);
  assert.match(markdown, /~~~atomic-cues extra\nactivity: golf\n~~~/);
  assert.match(markdown, /```atomic-cues\nactivity: gym\n```/);
});

test("rewriteDedicatedCueFences ignores lookalike languages", () => {
  const input = "```atomic-golf-cues-extra\nyear: 1\n```\n";
  assert.equal(rewriteDedicatedCueFences(input), input);
});

test("dedicatedCueHostPaths is golf and gym hosts only", () => {
  const badminton = createExerciseActivityType("Badminton");
  const paths = dedicatedCueHostPaths({
    ...DEFAULT_SETTINGS,
    activityTypes: [...DEFAULT_SETTINGS.activityTypes, badminton],
    golfCuesPath: "Notes/Golf cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
  });
  assert.deepEqual(
    [...paths].sort(),
    [
      "Notes/Golf cues.md",
      "atomics/exercise/Golf/Cues.md",
      "atomics/exercise/Gym/Cues.md",
    ].sort(),
  );
});
