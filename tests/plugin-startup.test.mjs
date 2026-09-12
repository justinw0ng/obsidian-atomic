import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(join(root, "src/main.ts"), "utf8");

/** Source from `signature` through the matching close brace of its first block. */
function bracedBlock(source, signature) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} not found`);
  let depth = 0;
  for (let i = source.indexOf("{", start); i < source.length; i++) {
    if (source[i] === "{") depth += 1;
    if (source[i] === "}") depth -= 1;
    if (depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(`unbalanced braces after ${signature}`);
}

test("vault listeners register after layout ready so the startup create burst is skipped", () => {
  const registrations = main.match(/this\.app\.vault\.on\(/g) || [];
  const inside =
    bracedBlock(main, "private registerVaultEvents()").match(/this\.app\.vault\.on\(/g) || [];
  assert.equal(inside.length, 4, "modify, delete, rename, create");
  assert.equal(registrations.length, inside.length, "no vault.on outside registerVaultEvents");

  const onload = bracedBlock(main, "async onload()");
  assert.doesNotMatch(onload, /this\.app\.vault\.on\(/);
  const layoutReady = bracedBlock(onload, "onLayoutReady(() => {");
  assert.match(layoutReady, /this\.registerVaultEvents\(\)/);
  assert.match(layoutReady, /migrateDedicatedCueHosts\(this\.data, this\.settings\)/);
  assert.match(layoutReady, /this\.scheduleRefresh\(\)/);
  assert.match(layoutReady, /if \(this\.unloaded\) return;/);

  // The only other refresh trigger in onload is the metadata `resolved` handler.
  const resolved = bracedBlock(onload, 'metadataCache.on("resolved", () => {');
  assert.match(resolved, /this\.scheduleRefresh\(\)/);
  const rest = onload.replace(layoutReady, "").replace(resolved, "");
  assert.doesNotMatch(rest, /scheduleRefresh\(\)/, "no eager refresh before layout ready");
  assert.match(bracedBlock(main, "onunload()"), /this\.unloaded = true;/);
});

test("refresh gating compares pre-normalized roots per event", () => {
  assert.match(main, /collectAtomicDataRoots\(this\.settings\)/);
  const refreshPath = readFileSync(join(root, "src/util/refresh-path.ts"), "utf8");
  const affects = bracedBlock(refreshPath, "export function pathAffectsAtomicRefresh(");
  assert.match(affects, /liveBlockSourcePaths\.includes\(norm\)/);
  assert.match(affects, /roots\.filePaths\.includes\(norm\)/);
  assert.equal(
    (affects.match(/normalizeVaultPath\(/g) || []).length,
    1,
    "normalize the event path once",
  );
});

test("live block tracking is a single pass", () => {
  const body = bracedBlock(main, "trackLiveBlock(block: LiveBlock)");
  assert.equal((body.match(/\.filter\(/g) || []).length, 1);
});

test("tracking only replaces the same host and untracks on unload", () => {
  // The editor detaches offscreen codeblocks without re-running their
  // post-processor, so connectivity must not decide what stays registered.
  const track = bracedBlock(main, "trackLiveBlock(block: LiveBlock)");
  assert.match(track, /b\.el !== block\.el/);
  assert.doesNotMatch(track, /isConnected/);

  const refresh = bracedBlock(main, "async refreshAll()");
  assert.doesNotMatch(refresh, /isConnected/);

  const untrack = bracedBlock(main, "untrackLiveBlock(block: LiveBlock)");
  assert.match(untrack, /b\.el !== block\.el/);

  // The render child is the single owner of "which blocks are live".
  const codeblocks = readFileSync(join(root, "src/codeblocks.ts"), "utf8");
  const child = bracedBlock(codeblocks, "class AtomicBlockChild");
  assert.match(child, /onload\(\): void \{[\s\S]*this\.plugin\.trackLiveBlock\(this\.block\)/);
  assert.match(child, /onunload\(\): void \{[\s\S]*this\.plugin\.untrackLiveBlock\(this\.block\)/);
  const processor = bracedBlock(codeblocks, "export function registerCodeblocks(");
  assert.match(processor, /ctx\.addChild\(new AtomicBlockChild\(el, plugin, block\)\)/);
  assert.doesNotMatch(processor, /trackLiveBlock/);
});
