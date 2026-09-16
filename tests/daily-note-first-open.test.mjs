import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseTimeLog } from "../src/core/hobby.ts";
import { BLUE, GREEN, ORANGE } from "../src/types.ts";
import { durationMapFromHobbyLogs, durationMapFromSessions } from "../src/util/duration-map.ts";
import {
  cachesAfterPass,
  dailyNotePassIo,
  dailyNoteStartupIo,
  dailyNoteStartupPasses,
} from "../src/util/first-open-work.ts";
import { markdownFilesInFolder } from "../src/util/folder-files.ts";
import { hobbyItemFromFileCache } from "../src/util/hobby-item-scan.ts";
import {
  appendHeatmapWeeks,
  buildHeatmapWeeks,
  sameDurationMap,
  sameHeatmapPaintState,
} from "../src/util/heatmap-model.ts";
import { NoteParseCache } from "../src/util/note-parse-cache.ts";
import { sessionMetaFromFile } from "../src/util/session-meta.ts";
import { VaultListCache } from "../src/util/vault-list-cache.ts";
import { hobbyItemsScanPrefix, sessionScanPrefix } from "../src/util/vault-path.ts";
import {
  golfSessionMarkdown,
  gymSessionMarkdown,
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
      body: gymSessionMarkdown(date),
      frontmatter: { duration_min: 45, date, activity: "gym" },
      mtime: 1,
    });
  }
  for (let i = 0; i < SCALE.golfSessions; i++) {
    const date = ymdFromIndex(YEAR, i);
    golf.push({
      path: `atomics/exercise/Golf/${YEAR}/${date}.md`,
      basename: date,
      body: golfSessionMarkdown(date),
      frontmatter: { duration_min: 60, date, activity: "golf" },
      mtime: 1,
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
      mtime: 1,
    });
  }
  return { gym, golf, reading };
}

/**
 * Mirrors VaultDataSource cache rules for the daily-note blocks without Obsidian.
 */
class CountingDailyNoteSource {
  constructor(notes, layoutReady) {
    this.layoutReady = layoutReady;
    this.byPath = new Map(
      [...notes.gym, ...notes.golf, ...notes.reading].map((note) => [note.path, note]),
    );
    this.gymFolder = {
      path: `atomics/exercise/Gym/${YEAR}`,
      children: notes.gym.map((note) => ({
        path: note.path,
        basename: note.basename,
        extension: "md",
      })),
    };
    this.golfFolder = {
      path: `atomics/exercise/Golf/${YEAR}`,
      children: notes.golf.map((note) => ({
        path: note.path,
        basename: note.basename,
        extension: "md",
      })),
    };
    this.readingFolder = {
      path: "atomics/hobbies/Reading/Items",
      children: notes.reading.map((note) => ({
        path: note.path,
        basename: note.basename,
        extension: "md",
      })),
    };
    this.timeLogCache = new NoteParseCache();
    this.sessionListCache = new VaultListCache();
    this.hobbyItemListCache = new VaultListCache();
    this.durationMapCache = new VaultListCache();
    this.stats = {
      cachedRead: 0,
      getFileCache: 0,
      sessionWalks: 0,
      hobbyWalks: 0,
    };
    this.readingActivity = {
      id: "reading",
      domain: "hobby",
      folder: "atomics/hobbies/Reading",
      noteModel: "item",
      supportsTimer: true,
    };
  }

  cacheList(cache, key, value, scope) {
    if (!this.layoutReady) return;
    cache.set(key, value, scope);
  }

  listSessions(folder) {
    const prefix = sessionScanPrefix(folder, YEAR);
    const cached = this.sessionListCache.get(prefix);
    if (cached) return cached;
    this.stats.sessionWalks += 1;
    const tree = folder.includes("Golf") ? this.golfFolder : this.gymFolder;
    const out = [];
    for (const file of markdownFilesInFolder(tree)) {
      const note = this.byPath.get(file.path);
      this.stats.getFileCache += 1;
      out.push(
        sessionMetaFromFile({
          path: file.path,
          basename: file.basename,
          frontmatter: note?.frontmatter,
        }),
      );
    }
    this.cacheList(this.sessionListCache, prefix, out, prefix);
    return out;
  }

  listHobbyItems() {
    const prefix = hobbyItemsScanPrefix(this.readingActivity.folder);
    const cacheKey = `${this.readingActivity.id}\0${prefix}`;
    const cached = this.hobbyItemListCache.get(cacheKey);
    if (cached) return cached;
    this.stats.hobbyWalks += 1;
    const out = [];
    for (const file of markdownFilesInFolder(this.readingFolder)) {
      const note = this.byPath.get(file.path);
      this.stats.getFileCache += 1;
      const item = hobbyItemFromFileCache({
        path: file.path,
        basename: file.basename,
        frontmatter: note?.frontmatter ?? null,
        activityId: "reading",
      });
      if (item) out.push(item);
    }
    this.cacheList(this.hobbyItemListCache, cacheKey, out, prefix);
    return out;
  }

  async getHobbyTimeLogEntries(path) {
    const note = this.byPath.get(path);
    if (!note) return [];
    return this.timeLogCache.resolve(path, note.mtime, async () => {
      this.stats.cachedRead += 1;
      return parseTimeLog(note.body);
    });
  }

  async getActivityDurationMap(kind) {
    if (kind === "reading") {
      const prefix = hobbyItemsScanPrefix(this.readingActivity.folder);
      const cacheKey = `reading\0${prefix}\0${YEAR}`;
      const cached = this.durationMapCache.get(cacheKey);
      if (cached) return cached;
      const items = this.listHobbyItems();
      const perItem = await Promise.all(
        items.map(async (item) => ({
          path: item.path,
          entries: await this.getHobbyTimeLogEntries(item.path),
        })),
      );
      const map = durationMapFromHobbyLogs(perItem, YEAR);
      this.cacheList(this.durationMapCache, cacheKey, map, prefix);
      return map;
    }
    const folder =
      kind === "golf" ? "atomics/exercise/Golf" : "atomics/exercise/Gym";
    const prefix = sessionScanPrefix(folder, YEAR);
    const cacheKey = `${kind}\0${prefix}\0${YEAR}`;
    const cached = this.durationMapCache.get(cacheKey);
    if (cached) return cached;
    const map = durationMapFromSessions(this.listSessions(folder));
    this.cacheList(this.durationMapCache, cacheKey, map, prefix);
    return map;
  }

  async paintDailyNote() {
    const maps = await Promise.all([
      this.getActivityDurationMap("gym"),
      this.getActivityDurationMap("golf"),
      this.getActivityDurationMap("reading"),
    ]);
    this.listHobbyItems();
    return maps;
  }
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
});

test("first-open I/O model: reading bodies once, lists twice without the layout-ready guard", () => {
  const withRestore = dailyNoteStartupPasses({
    renderBeforeLayoutReady: true,
    metadataReadyAtLayoutReady: false,
  });
  assert.deepEqual(withRestore, ["restore", "layout-ready", "metadata-resolved"]);
  const wasted = dailyNoteStartupIo(SCALE, withRestore);
  assert.equal(wasted.readingBodyReads, SCALE.readingItems);
  assert.equal(wasted.hobbyListWalks, 6);
  assert.equal(wasted.sessionListWalks, 6);

  const deferred = dailyNoteStartupPasses({
    renderBeforeLayoutReady: false,
    metadataReadyAtLayoutReady: true,
  });
  assert.deepEqual(deferred, ["layout-ready"]);
  const once = dailyNoteStartupIo(SCALE, deferred);
  assert.equal(once.readingBodyReads, SCALE.readingItems);
  assert.equal(once.hobbyListWalks, 2);
  assert.equal(once.sessionListWalks, 2);
  assert.equal(once.metadataLookups, SCALE.gymSessions + SCALE.golfSessions + SCALE.readingItems * 2);

  const restoreIo = dailyNotePassIo(SCALE, { listCached: false, timeLogCached: false });
  assert.equal(restoreIo.readingBodyReads, SCALE.readingItems);
  assert.equal(restoreIo.hobbyListWalks, 2);
  assert.deepEqual(cachesAfterPass("restore"), {
    listCached: false,
    timeLogCached: false,
  });
  assert.deepEqual(cachesAfterPass("layout-ready"), {
    listCached: false,
    timeLogCached: true,
  });
});

test("counting source: restore + layout-ready re-walks lists but Time logs hit cache", async () => {
  const notes = buildScaleNotes();
  const restore = new CountingDailyNoteSource(notes, false);
  const restoreMaps = await restore.paintDailyNote();
  assert.equal(restore.stats.cachedRead, SCALE.readingItems);
  assert.equal(restore.stats.hobbyWalks, 2);
  assert.equal(restore.stats.sessionWalks, 2);
  assert.equal(restore.stats.getFileCache, SCALE.gymSessions + SCALE.golfSessions + SCALE.readingItems * 2);

  restore.layoutReady = true;
  const readyMaps = await restore.paintDailyNote();
  assert.equal(restore.stats.cachedRead, SCALE.readingItems, "NoteParseCache prevents a second body read");
  assert.equal(restore.stats.hobbyWalks, 3, "second pass caches the hobby list after the first walk");
  assert.equal(restore.stats.sessionWalks, 4);
  assert.equal(sameDurationMap(restoreMaps[0], readyMaps[0]), true);
  assert.equal(sameDurationMap(restoreMaps[2], readyMaps[2]), true);
  assert.notEqual(restoreMaps[2], readyMaps[2], "uncached first pass yields a new Map");
});

test("counting source: first paint after layout ready is one list walk and one body-read pass", async () => {
  const notes = buildScaleNotes();
  const source = new CountingDailyNoteSource(notes, true);
  const maps = await source.paintDailyNote();
  assert.equal(source.stats.cachedRead, SCALE.readingItems);
  assert.equal(source.stats.hobbyWalks, 1);
  assert.equal(source.stats.sessionWalks, 2);
  const again = await source.paintDailyNote();
  assert.equal(source.stats.cachedRead, SCALE.readingItems);
  assert.equal(source.stats.hobbyWalks, 1);
  assert.equal(maps[2], again[2]);
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
    assert.ok(serialMs >= 0);
    process.stdout.write(
      `first-open disk: ${SCALE.readingItems} reading notes serial read+parse ${serialMs.toFixed(1)}ms\n`,
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
