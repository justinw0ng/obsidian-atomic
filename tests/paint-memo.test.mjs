import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PaintMemo, sameList } from "../src/util/paint-memo.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function host(painted) {
  return {
    painted,
    querySelector(selector) {
      return this.painted && selector.includes("painted") ? {} : null;
    },
  };
}

test("PaintMemo skips only when the host is painted from an equivalent state", () => {
  const memo = new PaintMemo('[data-testid="painted"]', (prev, next) => prev?.key === next.key);
  const el = host(false);

  assert.equal(memo.shouldSkip(el, { key: "a" }), false, "first paint");
  el.painted = true;
  assert.equal(memo.shouldSkip(el, { key: "a" }), true, "same state, painted");
  assert.equal(memo.shouldSkip(el, { key: "b" }), false, "state changed");
  assert.equal(memo.shouldSkip(el, { key: "b" }), true, "new state now remembered");

  el.painted = false;
  assert.equal(memo.shouldSkip(el, { key: "b" }), false, "host emptied (fresh mount) repaints");

  const other = host(true);
  assert.equal(memo.shouldSkip(other, { key: "b" }), false, "states are per host element");
  assert.equal(memo.isPainted(other), true);
});

test("sameList compares element-wise and treats null as its own value", () => {
  assert.equal(sameList(null, null), true);
  assert.equal(sameList(null, []), false);
  assert.equal(sameList(["a"], ["a"]), true);
  assert.equal(sameList(["a"], ["b"]), false);
  assert.equal(sameList([1, 2], [1]), false);
  const shared = new Map();
  assert.equal(sameList([shared], [shared]), true);
  assert.equal(sameList([shared], [new Map()]), false);
  assert.equal(sameList([{ id: 1 }], [{ id: 1 }], (a, b) => a.id === b.id), true);
});

test("every paint-skipping view goes through one PaintMemo", () => {
  for (const [file, pattern] of [
    ["src/views/heatmap.ts", /heatmapPaint\.shouldSkip\(el, paintState\)/],
    ["src/views/book-shelf.ts", /bookShelfPaint\.shouldSkip\(el, paintState\)/],
    ["src/views/dashboard.ts", /dashboardPaint\.shouldSkip\(el, dashboardPaintState\(input, language\)\)/],
    ["src/views/cues.ts", /cuesPaint\.shouldSkip\(el, paintState\)/],
    ["src/views/cue-log.ts", /cueLogPaint\.shouldSkip\(el, paintState\)/],
  ]) {
    const source = readFileSync(join(root, file), "utf8");
    assert.match(source, pattern, file);
    assert.match(source, /new PaintMemo</, file);
    assert.doesNotMatch(source, /DomIsPainted/, file);
    assert.doesNotMatch(source, /PaintState = new WeakMap/, file);
  }
  const model = readFileSync(join(root, "src/util/heatmap-model.ts"), "utf8");
  assert.doesNotMatch(model, /sameStringList/);
  assert.match(model, /activities\.map\(activityPaintKey\)/);
});
