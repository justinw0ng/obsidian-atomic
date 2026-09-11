import test from "node:test";
import assert from "node:assert/strict";
import {
  minutesByDateForYear,
  parseTimeLog,
  sumMinutesForYear,
} from "../src/core/hobby.ts";
import { NoteParseCache } from "../src/util/note-parse-cache.ts";

const SAMPLE = `## Time log

- 2025-12-31 | 10 min | old year
- 2026-01-01 | 20 min | a
- 2026-01-01 | 5 min | b
- 2026-08-08 | 40 min | c
`;

test("minutesByDateForYear and sumMinutesForYear filter by calendar year", () => {
  const entries = parseTimeLog(SAMPLE);
  assert.deepEqual(
    [...minutesByDateForYear(entries, 2026).entries()].sort(),
    [
      ["2026-01-01", 25],
      ["2026-08-08", 40],
    ],
  );
  assert.equal(sumMinutesForYear(entries, 2026), 65);
  assert.equal(sumMinutesForYear(entries, 2025), 10);
  assert.equal(sumMinutesForYear(entries, 2024), 0);
});

test("NoteParseCache reuses parses for the same mtime and refreshes on change", () => {
  const cache = new NoteParseCache();
  const path = "atomics/hobbies/Reading/Items/Book.md";
  const entries = parseTimeLog(SAMPLE);

  assert.equal(cache.get(path, 100), null);
  cache.set(path, 100, entries);
  assert.equal(cache.get(path, 100), entries);
  assert.equal(cache.get(path, 101), null);

  cache.set(path, 101, []);
  assert.deepEqual(cache.get(path, 101), []);

  cache.rename(path, "atomics/hobbies/Reading/Items/Renamed.md");
  assert.equal(cache.get(path, 101), null);
  assert.deepEqual(cache.get("atomics/hobbies/Reading/Items/Renamed.md", 101), []);

  cache.invalidate("atomics/hobbies/Reading/Items/Renamed.md");
  assert.equal(cache.get("atomics/hobbies/Reading/Items/Renamed.md", 101), null);
  assert.equal(cache.size, 0);
});

test("NoteParseCache.resolve shares one in-flight load per path and mtime", async () => {
  const cache = new NoteParseCache();
  const path = "atomics/exercise/Gym/2026/2026-01-01.md";
  let loads = 0;
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const load = async () => {
    loads += 1;
    await gate;
    return [{ exercise: "Squat" }];
  };

  const first = cache.resolve(path, 7, load);
  const second = cache.resolve(path, 7, load);
  assert.equal(first, second, "same mtime reuses the pending promise");
  assert.equal(loads, 1);

  release();
  const rows = await first;
  assert.equal(await second, rows);
  assert.equal(cache.get(path, 7), rows, "settled value is cached under its mtime");

  const third = await cache.resolve(path, 7, load);
  assert.equal(third, rows, "later calls hit the cache, not the loader");
  assert.equal(loads, 1);

  const fresh = await cache.resolve(path, 8, async () => {
    loads += 1;
    return [];
  });
  assert.deepEqual(fresh, []);
  assert.equal(loads, 2, "a newer mtime loads again");
  assert.equal(cache.get(path, 7), null, "one entry per path: the newer mtime wins");
});

test("NoteParseCache.resolve drops a failed load so the next call retries", async () => {
  const cache = new NoteParseCache();
  const path = "atomics/exercise/Gym/2026/2026-01-02.md";
  await assert.rejects(
    cache.resolve(path, 1, async () => {
      throw new Error("disk");
    }),
    /disk/,
  );
  assert.equal(cache.get(path, 1), null);
  const value = await cache.resolve(path, 1, async () => "ok");
  assert.equal(value, "ok");
  assert.equal(cache.get(path, 1), "ok");
});

test("NoteParseCache.invalidate during a load discards that load's result", async () => {
  const cache = new NoteParseCache();
  const path = "atomics/exercise/Gym/2026/2026-01-03.md";
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  const pending = cache.resolve(path, 3, async () => {
    await gate;
    return "stale";
  });
  cache.invalidate(path);
  release();
  assert.equal(await pending, "stale", "the caller still gets its value");
  assert.equal(cache.get(path, 3), null, "but it is not stored after invalidation");
});
