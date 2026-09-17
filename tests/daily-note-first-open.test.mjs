import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTimeLog } from "../src/core/hobby.ts";
import { BLUE, GREEN, ORANGE } from "../src/types.ts";
import { durationMapFromHobbyLogs, durationMapFromSessions } from "../src/util/duration-map.ts";
import {
  appendHeatmapWeeks,
  buildHeatmapWeeks,
  sameDurationMap,
  sameHeatmapPaintState,
} from "../src/util/heatmap-model.ts";
import { sessionMetaFromFile } from "../src/util/session-meta.ts";
import {
  NODE_DAILY_NOTE_SCALE,
  readingItemMarkdown,
  ymdFromIndex,
} from "../e2e/lib/scale-vault.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const YEAR = 2026;
const SCALE = NODE_DAILY_NOTE_SCALE;
const CPU_BUDGET_MS = process.env.CI ? 2500 : 800;

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function countingHost() {
  let creates = 0;
  const host = {
    style: { backgroundColor: "" },
    createDiv() {
      creates += 1;
      return host;
    },
  };
  return { host, count: () => creates };
}

function buildScaleNotes() {
  const gym = [];
  const golf = [];
  const reading = [];
  for (let i = 0; i < SCALE.gymSessions; i++) {
    const date = ymdFromIndex(YEAR, i);
    gym.push({
      path: `atomics/exercise/Gym/${YEAR}/${date}.md`,
      basename: date,
      body: `# Gym — ${date}`,
      frontmatter: { duration_min: 45, date, activity: "gym" },
    });
  }
  for (let i = 0; i < SCALE.golfSessions; i++) {
    const date = ymdFromIndex(YEAR, i);
    golf.push({
      path: `atomics/exercise/Golf/${YEAR}/${date}.md`,
      basename: date,
      body: `# Golf — ${date}`,
      frontmatter: { duration_min: 60, date, activity: "golf" },
    });
  }
  for (let i = 0; i < SCALE.readingItems; i++) {
    const title = `Scale Book ${i + 1}`;
    const date = ymdFromIndex(YEAR, i % 365);
    const minutes = 20 + (i % 15);
    reading.push({
      path: `atomics/hobbies/Reading/Items/${title}.md`,
      basename: title,
      body: readingItemMarkdown({
        title,
        status: i % 5 === 0 ? "reading" : "finished",
        date,
        minutes,
      }),
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        title,
        status: i % 5 === 0 ? "reading" : "finished",
        total_min: minutes,
      },
    });
  }
  return { gym, golf, reading };
}

test("default daily note source contracts: gym/golf metadata, reading body reads", () => {
  const vault = src("src/data/vault-source.ts");
  assert.match(vault, /getHobbyTimeLogEntries\(item\.path\)/);
  assert.match(vault, /durationMapFromSessions\(this\.listSessions/);
  assert.match(vault, /if \(!this\.app\.workspace\.layoutReady\) return;/);
  assert.doesNotMatch(vault, /getMarkdownFiles/);

  const heatmap = src("src/views/heatmap.ts");
  assert.match(heatmap, /getActivityDurationMap/);
  assert.doesNotMatch(heatmap, /cachedRead/);

  const today = src("src/views/today.ts");
  assert.doesNotMatch(today, /listSessions|cachedRead|getHobbyTimeLogEntries/);

  const bookshelf = src("src/views/book-shelf.ts");
  assert.match(bookshelf, /listHobbyItems/);
  assert.doesNotMatch(bookshelf, /getHobbyTimeLogEntries|cachedRead/);

  const codeblocks = src("src/codeblocks.ts");
  assert.match(codeblocks, /workspace\.layoutReady/);
  assert.match(
    codeblocks,
    /if \(!plugin\.app\.workspace\.layoutReady\) return;/,
  );
  assert.doesNotMatch(
    codeblocks,
    /if \(!block\.el\.isConnected\) \{\s*plugin\.scheduleRefresh/,
  );
  assert.equal(existsSync(join(root, "src/util/first-open-work.ts")), false);
  assert.doesNotMatch(vault, /CountingDailyNoteSource/);
  assert.doesNotMatch(codeblocks, /CountingDailyNoteSource/);
});

test("heatmap paint-skip treats equal duration maps as the same paint", () => {
  const left = new Map([["2026-01-01", { minutes: 45, path: "gym.md" }]]);
  const right = new Map([["2026-01-01", { minutes: 45, path: "gym.md" }]]);
  const state = {
    year: 2026,
    timezone: "UTC",
    language: "en",
    layoutKey: "2:2:300:1.2",
    activityKey: "gym",
    invalidIds: [],
    maps: [left],
  };
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [right] }), true);
  assert.equal(sameDurationMap(left, right), true);
  assert.notEqual(left, right);
  assert.equal(
    sameHeatmapPaintState(state, {
      ...state,
      maps: [new Map([["2026-01-01", { minutes: 90, path: "gym.md" }]])],
    }),
    false,
  );
});

test("scale daily note CPU: parse reading logs + three heatmap grids", () => {
  const notes = buildScaleNotes();
  const t0 = performance.now();
  const gymMap = durationMapFromSessions(
    notes.gym.map((note) =>
      sessionMetaFromFile({
        path: note.path,
        basename: note.basename,
        frontmatter: note.frontmatter,
      }),
    ),
  );
  const golfMap = durationMapFromSessions(
    notes.golf.map((note) =>
      sessionMetaFromFile({
        path: note.path,
        basename: note.basename,
        frontmatter: note.frontmatter,
      }),
    ),
  );
  const readingMap = durationMapFromHobbyLogs(
    notes.reading.map((note) => ({
      path: note.path,
      entries: parseTimeLog(note.body),
    })),
    YEAR,
  );
  const colors = [GREEN, ORANGE, BLUE];
  let cells = 0;
  const painted = [gymMap, golfMap, readingMap].map((activityMap, i) => {
    const weeks = buildHeatmapWeeks({
      year: YEAR,
      todayStr: `${YEAR}-09-16`,
      language: "en",
      activityMap,
    });
    const { host, count } = countingHost();
    appendHeatmapWeeks(host, weeks, colors[i], "{date}: {minutes}", "{date}: {minutes}");
    cells += count();
    return weeks.length;
  });
  const elapsed = performance.now() - t0;
  assert.equal(painted.length, 3);
  assert.ok(cells >= 3 * 370, `expected ~1110 heatmap createDivs, got ${cells}`);
  assert.ok(
    elapsed < CPU_BUDGET_MS,
    `scale CPU ${elapsed.toFixed(1)}ms over ${CPU_BUDGET_MS}ms (gym ${SCALE.gymSessions}, golf ${SCALE.golfSessions}, reading ${SCALE.readingItems})`,
  );
});

test("scale reading notes: disk cachedRead-equivalent is the first-open I/O", () => {
  const dir = mkdtempSync(join(tmpdir(), "atomic-first-open-"));
  const paths = [];
  try {
    for (let i = 0; i < SCALE.readingItems; i++) {
      const date = ymdFromIndex(YEAR, i % 365);
      const path = join(dir, `book-${i + 1}.md`);
      writeFileSync(
        path,
        readingItemMarkdown({
          title: `Scale Book ${i + 1}`,
          status: "finished",
          date,
          minutes: 25,
        }),
        "utf8",
      );
      paths.push(path);
    }
    const t0 = performance.now();
    for (const path of paths) parseTimeLog(readFileSync(path, "utf8"));
    const serialMs = performance.now() - t0;
    assert.ok(
      serialMs < CPU_BUDGET_MS,
      `150 reading notes serial read+parse ${serialMs.toFixed(1)}ms (budget ${CPU_BUDGET_MS}ms)`,
    );
    process.stdout.write(
      `first-open disk: ${SCALE.readingItems} reading notes serial read+parse ${serialMs.toFixed(1)}ms\n`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
