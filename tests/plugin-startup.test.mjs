import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const main = readFileSync(join(root, "src/main.ts"), "utf8");

function methodBody(source, signature) {
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
  const inside = methodBody(main, "private registerVaultEvents()").match(/this\.app\.vault\.on\(/g) || [];
  assert.equal(inside.length, 4, "modify, delete, rename, create");
  assert.equal(registrations.length, inside.length, "no vault.on outside registerVaultEvents");

  const onload = methodBody(main, "async onload()");
  assert.doesNotMatch(onload, /this\.app\.vault\.on\(/);
  const layoutReady = onload.match(/onLayoutReady\(\(\) => \{([^}]*)\}/);
  assert.ok(layoutReady, "onLayoutReady callback not found");
  assert.match(layoutReady[1], /this\.registerVaultEvents\(\)/);
  assert.match(layoutReady[1], /this\.scheduleRefresh\(\)/);
  assert.match(layoutReady[1], /if \(this\.unloaded\) return;/);

  // The only other refresh trigger in onload is the metadata `resolved` handler.
  const resolved = onload.match(/metadataCache\.on\("resolved", \(\) => \{([^}]*)\}/);
  assert.ok(resolved, "resolved handler not found");
  assert.match(resolved[1], /this\.scheduleRefresh\(\)/);
  const rest = onload.replace(layoutReady[0], "").replace(resolved[0], "");
  assert.doesNotMatch(rest, /scheduleRefresh\(\)/, "no eager refresh before layout ready");
  assert.match(methodBody(main, "onunload()"), /this\.unloaded = true;/);
});

test("refresh gating compares pre-normalized roots per event", () => {
  assert.match(main, /collectAtomicDataRoots\(this\.settings\)/);
  assert.doesNotMatch(main, /dataRoots/);
  const refreshPath = readFileSync(join(root, "src/util/refresh-path.ts"), "utf8");
  const affects = methodBody(refreshPath, "export function pathAffectsAtomicRefresh(");
  assert.match(affects, /liveBlockSourcePaths\.includes\(norm\)/);
  assert.match(affects, /roots\.filePaths\.includes\(norm\)/);
  assert.equal((affects.match(/normalizeVaultPath\(/g) || []).length, 1, "normalize the event path once");
});

test("live block tracking is a single pass", () => {
  const body = methodBody(main, "trackLiveBlock(block: LiveBlock)");
  assert.equal((body.match(/\.filter\(/g) || []).length, 1);
});
