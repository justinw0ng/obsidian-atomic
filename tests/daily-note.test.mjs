import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DAILY_NOTE_TEMPLATE_PATH,
  DAILY_NOTES_FOLDER,
  OBSIDIAN_DAILY_NOTE_DATE_TOKEN,
  dailyNoteBookshelfActivityId,
  dailyNoteHeatmapActivityOption,
  dailyNoteTemplateMarkdown,
  todaysDailyNoteMarkdown,
  todaysDailyNotePath,
} from "../src/core/daily-note.ts";
import {
  createDailyNoteTemplateFile,
  createTodaysDailyNoteFile,
} from "../src/commands/create-daily-note.ts";
import { dailyNoteHeadingForLanguage } from "../src/dates.ts";
import { defaultAtomicBlockFence } from "../src/util/codeblock-defaults.ts";
import {
  createExerciseActivityType,
  createHobbyActivityType,
} from "../src/util/activity-types.ts";
import { DEFAULT_ACTIVITY_TYPES } from "../src/types.ts";

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

test("daily note template path is the core Templates example location", () => {
  assert.equal(DAILY_NOTE_TEMPLATE_PATH, "Templates/Atomic daily note.md");
  assert.equal(DAILY_NOTES_FOLDER, "Daily notes");
  assert.equal(todaysDailyNotePath("2026-08-11"), "Daily notes/2026-08-11.md");
});

test("todaysDailyNotePath rejects non-YMD dates", () => {
  assert.throws(() => todaysDailyNotePath("../evil"), /YYYY-MM-DD/);
  assert.throws(() => todaysDailyNotePath("2026/08/11"), /YYYY-MM-DD/);
  assert.throws(() => todaysDailyNotePath(""), /YYYY-MM-DD/);
});

test("heatmap and bookshelf options follow enabled habits", () => {
  assert.equal(
    dailyNoteHeatmapActivityOption(DEFAULT_ACTIVITY_TYPES),
    "gym, golf, reading",
  );
  assert.equal(dailyNoteBookshelfActivityId(DEFAULT_ACTIVITY_TYPES), "reading");

  const gym = createExerciseActivityType("Gym");
  const reading = createHobbyActivityType("Reading");
  reading.enabled = false;
  assert.equal(dailyNoteHeatmapActivityOption([gym, reading]), "gym");
  assert.equal(dailyNoteBookshelfActivityId([gym, reading]), null);
  assert.equal(dailyNoteHeatmapActivityOption([]), "all");
});

test("English daily-note template matches the committed example", () => {
  const expected = readFileSync(
    join(root, "examples/templates/Atomic daily note.md"),
    "utf8",
  );
  assert.equal(dailyNoteTemplateMarkdown("en", DEFAULT_ACTIVITY_TYPES), expected);
  assert.match(expected, new RegExp(`# ${OBSIDIAN_DAILY_NOTE_DATE_TOKEN.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`));
});

test("resolved daily note uses a long weekday heading and omits heatmap year", () => {
  assert.equal(dailyNoteHeadingForLanguage(2026, 8, 11, "en"), "Tuesday, August 11, 2026");
  const markdown = todaysDailyNoteMarkdown("en", DEFAULT_ACTIVITY_TYPES, "2026-08-11");
  assert.match(markdown, /^# Tuesday, August 11, 2026\n/);
  assert.ok(markdown.includes(defaultAtomicBlockFence("atomic-bookshelf", "en")));
  assert.ok(markdown.includes(defaultAtomicBlockFence("atomic-actions", "en")));
  assert.ok(
    markdown.includes(
      defaultAtomicBlockFence("atomic-heatmap", "en", {
        activity: "gym, golf, reading",
        rows: "2",
        columns: "2",
      }),
    ),
  );
  assert.ok(markdown.includes(defaultAtomicBlockFence("atomic-today", "en")));
  assert.doesNotMatch(markdown, /^year:\s*\d{4}/m);
  assert.doesNotMatch(markdown, /atomic-timer/);
  assert.doesNotMatch(markdown, /atomic-gym-log/);
  assert.doesNotMatch(markdown, /atomic-cues/);
});

test("zh-Hant-en daily note translates the track heading and keeps fences", () => {
  const markdown = dailyNoteTemplateMarkdown("zh-Hant-en", DEFAULT_ACTIVITY_TYPES);
  assert.match(markdown, /記錄今日活動！/);
  assert.ok(markdown.includes(defaultAtomicBlockFence("atomic-actions", "zh-Hant-en")));
});

test("daily note omits the book shelf when no item habit is enabled", () => {
  const gym = createExerciseActivityType("Gym");
  const markdown = dailyNoteTemplateMarkdown("en", [gym]);
  assert.doesNotMatch(markdown, /atomic-bookshelf/);
  assert.match(markdown, /^activity: gym  # /m);
});

test("createDailyNoteTemplateFile writes once and leaves an existing note", async () => {
  const data = mockData();
  const created = await createDailyNoteTemplateFile(data, DEFAULT_ACTIVITY_TYPES, "en");
  assert.deepEqual(created, { path: DAILY_NOTE_TEMPLATE_PATH, created: true });
  assert.equal(
    data.files.get(DAILY_NOTE_TEMPLATE_PATH),
    dailyNoteTemplateMarkdown("en", DEFAULT_ACTIVITY_TYPES),
  );

  const kept = "# keep me\n";
  const existing = mockData({ [DAILY_NOTE_TEMPLATE_PATH]: kept });
  const skipped = await createDailyNoteTemplateFile(
    existing,
    DEFAULT_ACTIVITY_TYPES,
    "en",
  );
  assert.deepEqual(skipped, { path: DAILY_NOTE_TEMPLATE_PATH, created: false });
  assert.equal(existing.files.get(DAILY_NOTE_TEMPLATE_PATH), kept);
  assert.deepEqual(existing.created, []);
});

test("createTodaysDailyNoteFile uses timezone today and skips existing notes", async () => {
  const now = new Date("2026-09-18T15:00:00Z");
  const data = mockData();
  const created = await createTodaysDailyNoteFile(
    data,
    DEFAULT_ACTIVITY_TYPES,
    "UTC",
    "en",
    now,
  );
  assert.deepEqual(created, { path: "Daily notes/2026-09-18.md", created: true });
  assert.equal(
    data.files.get("Daily notes/2026-09-18.md"),
    todaysDailyNoteMarkdown("en", DEFAULT_ACTIVITY_TYPES, "2026-09-18"),
  );

  const skipped = await createTodaysDailyNoteFile(
    data,
    DEFAULT_ACTIVITY_TYPES,
    "UTC",
    "en",
    now,
  );
  assert.deepEqual(skipped, { path: "Daily notes/2026-09-18.md", created: false });
  assert.deepEqual(data.created, ["Daily notes/2026-09-18.md"]);
});

test("create command sources notice created, existing, and failed paths", () => {
  const source = readFileSync(join(root, "src/commands/create-daily-note.ts"), "utf8");
  assert.match(source, /notice\.createdDailyNoteTemplate/);
  assert.match(source, /notice\.dailyNoteTemplateExists/);
  assert.match(source, /notice\.dailyNoteTemplateFailed/);
  assert.match(source, /notice\.createdTodaysDailyNote/);
  assert.match(source, /notice\.todaysDailyNoteExists/);
  assert.match(source, /notice\.todaysDailyNoteFailed/);
  assert.match(source, /if \(data\.exists\(path\)\)/);
  assert.doesNotMatch(source, /writeNote/);
  assert.match(source, /openPath\(result\.path\)/);

  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  assert.match(main, /id: "create-daily-note-template"/);
  assert.match(main, /id: "create-todays-daily-note"/);
  assert.match(main, /createDailyNoteTemplateCommand/);
  assert.match(main, /createTodaysDailyNoteCommand/);
  assert.doesNotMatch(main, /addRibbonIcon/);
});

test("createDailyNoteTemplateCommand is notice-only (does not steal the active note)", () => {
  const source = readFileSync(join(root, "src/commands/create-daily-note.ts"), "utf8");
  const templateCmd = source.slice(
    source.indexOf("export async function createDailyNoteTemplateCommand"),
    source.indexOf("export async function createTodaysDailyNoteCommand"),
  );
  assert.doesNotMatch(templateCmd, /openPath/);
});
