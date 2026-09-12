import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  dedicatedCueHostPaths,
  migrateDedicatedCueHosts,
  rewriteDedicatedCueFences,
} from "../src/util/rewrite-cue-fences.ts";
import { DEFAULT_ACTIVITY_TYPES, DEFAULT_SETTINGS } from "../src/types.ts";
import { createExerciseActivityType } from "../src/util/activity-types.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function mockVault(files) {
  const store = new Map(Object.entries(files));
  const processed = [];
  return {
    store,
    processed,
    exists: (path) => store.has(path),
    readBody: async (path) => store.get(path) ?? "",
    processNote: async (path, updater) => {
      const next = updater(store.get(path) ?? "");
      store.set(path, next);
      processed.push(path);
    },
  };
}

test("rewriteDedicatedCueFences rewrites language and inserts activity", () => {
  const input = `# Cues\n\nUse atomic-golf-cues in prose.\n\n\`\`\`atomic-golf-cues\nyear: 2026\n\`\`\`\n`;
  const markdown = rewriteDedicatedCueFences(input);
  assert.match(markdown, /```atomic-cues\nactivity: golf\nyear: 2026\n```/);
  assert.match(markdown, /Use atomic-golf-cues in prose/);
  assert.doesNotMatch(markdown, /```atomic-golf-cues\b/);
});

test("rewriteDedicatedCueFences keeps an existing activity line", () => {
  const input = "```atomic-gym-cues\nactivity: gym\nyear: 2026\n```\n";
  const markdown = rewriteDedicatedCueFences(input);
  assert.equal(markdown, "```atomic-cues\nactivity: gym\nyear: 2026\n```\n");
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

test("dedicatedCueHostPaths includes activity Cues.md and settings aliases", () => {
  const badminton = createExerciseActivityType("Badminton");
  const paths = dedicatedCueHostPaths({
    activityTypes: [...DEFAULT_ACTIVITY_TYPES, badminton],
    golfCuesPath: "Notes/Golf cues.md",
    gymCuesPath: "atomics/exercise/Gym/Cues.md",
  });
  assert.deepEqual(
    [...paths].sort(),
    [
      "Notes/Golf cues.md",
      "atomics/exercise/Badminton/Cues.md",
      "atomics/exercise/Golf/Cues.md",
      "atomics/exercise/Gym/Cues.md",
    ].sort(),
  );
});

test("migrateDedicatedCueHosts rewrites existing hosts and skips missing", async () => {
  const gymPath = "atomics/exercise/Gym/Cues.md";
  const golfPath = "atomics/exercise/Golf/Cues.md";
  const data = mockVault({
    [gymPath]: "```atomic-gym-cues\nyear: 2026\n```\n",
    [golfPath]: "# Golf Cues\n",
  });
  const rewritten = await migrateDedicatedCueHosts(data, DEFAULT_SETTINGS);
  assert.deepEqual(rewritten, [gymPath]);
  assert.equal(
    data.store.get(gymPath),
    "```atomic-cues\nactivity: gym\nyear: 2026\n```\n",
  );
  assert.equal(data.store.get(golfPath), "# Golf Cues\n");
  assert.deepEqual(data.processed, [gymPath]);
});

test("processors no longer register dedicated cue languages", () => {
  const languages = readFileSync(join(root, "src/util/codeblock-languages.ts"), "utf8");
  const codeblocks = readFileSync(join(root, "src/codeblocks.ts"), "utf8");
  const defaults = readFileSync(join(root, "src/util/codeblock-defaults.ts"), "utf8");
  const seed = readFileSync(join(root, "scripts/seed-readme-demo-vault.mjs"), "utf8");
  const e2eVault = readFileSync(join(root, "e2e/lib/vault.mjs"), "utf8");
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.doesNotMatch(languages, /"atomic-golf-cues"/);
  assert.doesNotMatch(languages, /"atomic-gym-cues"/);
  assert.doesNotMatch(codeblocks, /case "atomic-golf-cues"/);
  assert.doesNotMatch(codeblocks, /case "atomic-gym-cues"/);
  assert.doesNotMatch(defaults, /"atomic-golf-cues"/);
  assert.doesNotMatch(defaults, /"atomic-gym-cues"/);
  assert.doesNotMatch(seed, /atomic-golf-cues|atomic-gym-cues/);
  assert.doesNotMatch(e2eVault, /atomic-golf-cues|atomic-gym-cues/);
  assert.doesNotMatch(readme, /atomic-golf-cues|atomic-gym-cues/);
});
