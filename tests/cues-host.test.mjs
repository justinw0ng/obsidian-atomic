import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  cueActivities,
  cuesHostMarkdown,
  ensureCuesHostFile,
  ensureCuesHostFiles,
  openCuesHostFile,
} from "../src/exercise/cues-host.ts";
import { parseBlockOptions } from "../src/util/parse-block.ts";
import { defaultAtomicBlockFence } from "../src/util/codeblock-defaults.ts";
import {
  createExerciseActivityType,
  createHobbyActivityType,
  cuePathForActivity,
} from "../src/util/activity-types.ts";
import { DEFAULT_ACTIVITY_TYPES } from "../src/types.ts";
import { resolveCueActivity } from "../src/util/codeblock-languages.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function mockData(existing = {}) {
  const files = new Map(Object.entries(existing));
  const created = [];
  const opened = [];
  return {
    files,
    created,
    opened,
    exists: (path) => files.has(path),
    createNote: async (path, content) => {
      if (files.has(path)) throw new Error(`already exists: ${path}`);
      files.set(path, content);
      created.push(path);
      return { path };
    },
    openPath: async (path) => {
      opened.push(path);
    },
  };
}

test("cueActivities is enabled cue-supporting exercises only", () => {
  const running = createExerciseActivityType("Running");
  running.supportsCues = false;
  const ids = cueActivities([
    ...DEFAULT_ACTIVITY_TYPES,
    running,
    createHobbyActivityType("Chess"),
  ]).map((activity) => activity.id);
  assert.deepEqual(ids, ["gym", "golf"]);
});

test("cuesHostMarkdown is the activity title plus an atomic-cues fence", () => {
  const badminton = createExerciseActivityType("Badminton");
  const markdown = cuesHostMarkdown(badminton, "en");
  assert.equal(
    markdown,
    `# Badminton\n\n${defaultAtomicBlockFence("atomic-cues", "en", {
      activity: "badminton",
    })}`,
  );
  const fence = markdown.split("```atomic-cues\n")[1]?.split("```")[0] ?? "";
  assert.deepEqual(parseBlockOptions(fence), { activity: "badminton" });
  assert.equal(resolveCueActivity("atomic-cues", parseBlockOptions(fence)), "badminton");
});

test("ensureCuesHostFile creates a missing host and leaves an existing note untouched", async () => {
  const gym = createExerciseActivityType("Gym");
  const path = cuePathForActivity(gym);
  const missing = mockData();
  const created = await ensureCuesHostFile(missing, gym, "en");
  assert.deepEqual(created, { path, created: true });
  assert.equal(missing.files.get(path), cuesHostMarkdown(gym, "en"));

  const kept = "# keep me\n";
  const existing = mockData({ [path]: kept });
  const skipped = await ensureCuesHostFile(existing, gym, "en");
  assert.deepEqual(skipped, { path, created: false });
  assert.equal(existing.files.get(path), kept);
  assert.deepEqual(existing.created, []);
});

test("ensureCuesHostFiles covers every cue-supporting exercise and skips hobbies", async () => {
  const data = mockData({
    "atomics/exercise/Golf/Cues.md": "# existing golf\n",
  });
  const results = await ensureCuesHostFiles(data, DEFAULT_ACTIVITY_TYPES, "en");
  assert.deepEqual(
    results.map((result) => [result.path, result.created]),
    [
      ["atomics/exercise/Gym/Cues.md", true],
      ["atomics/exercise/Golf/Cues.md", false],
    ],
  );
  assert.equal(
    data.files.get("atomics/exercise/Gym/Cues.md"),
    cuesHostMarkdown(DEFAULT_ACTIVITY_TYPES[0], "en"),
  );
  assert.equal(data.files.get("atomics/exercise/Golf/Cues.md"), "# existing golf\n");
  assert.equal(data.files.has("atomics/hobbies/Reading/Cues.md"), false);
});

test("ensureCuesHostFile rejects hobbies and cue-less exercise so created:false means exists", async () => {
  const reading = createHobbyActivityType("Reading");
  const running = createExerciseActivityType("Running");
  running.supportsCues = false;
  const data = mockData();
  await assert.rejects(
    () => ensureCuesHostFile(data, reading, "en"),
    /cue-supporting exercise/,
  );
  await assert.rejects(
    () => ensureCuesHostFile(data, running, "en"),
    /cue-supporting exercise/,
  );
  assert.equal(data.created.length, 0);
});

test("create command notices created, existing, empty, and failed hosts", () => {
  const source = readFileSync(join(root, "src/exercise/cues-host.ts"), "utf8");
  assert.match(source, /notice\.createdCues/);
  assert.match(source, /notice\.cuesExist/);
  assert.match(source, /notice\.noCueActivities/);
  assert.match(source, /notice\.cuesFailed/);
  assert.match(source, /if \(data\.exists\(path\)\)/);
  assert.doesNotMatch(source, /writeNote/);
});

test("openCuesHostFile ensures then opens the cuePathForActivity note", async () => {
  const gym = createExerciseActivityType("Gym");
  const data = mockData();
  await openCuesHostFile(data, gym, "en");
  assert.deepEqual(data.created, ["atomics/exercise/Gym/Cues.md"]);
  assert.deepEqual(data.opened, ["atomics/exercise/Gym/Cues.md"]);
});

test("dashboard activity links own ensure-then-open; path links stay path-only", () => {
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  const dashboard = readFileSync(join(root, "src/views/dashboard-dom.ts"), "utf8");
  assert.match(main, /id: "create-cues"/);
  assert.match(main, /createCuesHostCommand/);
  assert.match(main, /this\.ensureCuesHosts\(\)/);
  assert.match(dashboard, /openCuesHostFile/);
  assert.match(dashboard, /export function appendActivityLink\(/);
  assert.match(dashboard, /void link\.open\(\)/);
  assert.doesNotMatch(dashboard, /open\?:/);
  const pathLink = dashboard.slice(dashboard.indexOf("export function appendPathLink("));
  assert.match(pathLink, /void ctx\.data\.openPath\(path\)/);
  assert.doesNotMatch(pathLink.slice(0, pathLink.indexOf("export function appendSectionTitle")), /open\?/);
});
