import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

test("session bodies are parsed once per mtime through the shared note parse cache", () => {
  const source = src("src/data/vault-source.ts");
  assert.match(source, /new NoteParseCache<readonly TimeLogEntry\[\]>\(\)/);
  assert.match(source, /new NoteParseCache<readonly SetRow\[\]>\(\)/);
  assert.match(source, /new NoteParseCache<readonly string\[\]>\(\)/);
  assert.match(source, /getSessionSetRows\(path: string\): Promise<readonly SetRow\[\]>/);
  assert.match(source, /getSessionReminders\(path: string\): Promise<readonly string\[\]>/);
  assert.match(source, /cache\.resolve\(file\.path, file\.stat\.mtime/);
  assert.match(source, /readCachedBody\(path: string\)/);
  assert.doesNotMatch(source, /HobbyTimeLogCache/);
});

test("display views read parsed session data from the cache, never the disk", () => {
  const cues = src("src/views/cues.ts");
  assert.match(cues, /Promise\.all\(/);
  assert.match(cues, /data\.getSessionReminders\(session\.path\)/);
  assert.doesNotMatch(cues, /readBody/);
  assert.doesNotMatch(cues, /parseReminders/);

  const dashboard = src("src/views/dashboard.ts");
  assert.match(dashboard, /data\.getSessionSetRows\(meta\.path\)/);
  assert.doesNotMatch(dashboard, /readBody/);
  assert.doesNotMatch(dashboard, /parseSetTable/);

  const timer = src("src/views/timer.ts");
  assert.match(timer, /plugin\.data\.readCachedBody\(sourcePath\)/);
  assert.doesNotMatch(timer, /data\.readBody\(/);
});

test("write paths still take a fresh disk read", () => {
  assert.match(src("src/hobbies/reading-bookshelf.ts"), /data\.readBody\(READING_BOOKSHELF_REL\)/);
  assert.match(src("src/commands/gym-log-setup.ts"), /plugin\.data\.readBody\(path\)/);
  assert.match(src("src/views/timer.ts"), /await plugin\.app\.vault\.read\(file\)/);
});

test("folder scans are only cached once the layout is ready", () => {
  const source = src("src/data/vault-source.ts");
  assert.match(source, /if \(!this\.app\.workspace\.layoutReady\) return;/);
  assert.match(source, /this\.cacheList\(this\.sessionListCache, prefix, out, prefix\)/);
  assert.match(source, /this\.cacheList\(this\.hobbyItemListCache, cacheKey, out, prefix\)/);
  assert.equal((source.match(/this\.cacheList\(this\.durationMapCache, cacheKey, map, prefix\)/g) || []).length, 2);
  assert.doesNotMatch(source, /ListCache\.set\(/);
  assert.doesNotMatch(source, /durationMapCache\.set\(/);
});
