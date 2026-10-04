import test from "node:test";
import assert from "node:assert/strict";
import {
  heatmapRevealOffsets,
  scrollLeftToRevealToday,
} from "../src/util/heatmap-scroll.ts";

test("heatmapRevealOffsets uses the 13px week pitch", () => {
  assert.deepEqual(heatmapRevealOffsets(40, [0, 4]), {
    todayLeft: 520,
    todayWidth: 10,
    pitch: 13,
    monthStarts: [0, 52],
  });
});

test("scrollLeftToRevealToday snaps to the month start that keeps today in view", () => {
  assert.equal(
    scrollLeftToRevealToday({
      scrollWidth: 1000,
      clientWidth: 300,
      todayLeft: 520,
      todayWidth: 10,
      pitch: 13,
      monthStarts: [0, 52, 104, 156, 208, 260],
    }),
    260,
  );
});

test("scrollLeftToRevealToday returns 0 when the year fits", () => {
  assert.equal(
    scrollLeftToRevealToday({
      scrollWidth: 200,
      clientWidth: 300,
      todayLeft: 40,
      todayWidth: 10,
      pitch: 13,
      monthStarts: [0, 52],
    }),
    0,
  );
});

test("scrollLeftToRevealToday uses minLeft when no later month start exists", () => {
  assert.equal(
    scrollLeftToRevealToday({
      scrollWidth: 1000,
      clientWidth: 300,
      todayLeft: 520,
      todayWidth: 10,
      pitch: 13,
      monthStarts: [0, 100],
    }),
    260,
  );
});

test("scrollLeftToRevealToday keeps the today ring inside the pane", () => {
  const clientWidth = 280;
  const todayLeft = 520;
  const todayWidth = 10;
  const scrollLeft = scrollLeftToRevealToday({
    scrollWidth: 900,
    clientWidth,
    todayLeft,
    todayWidth,
    pitch: 13,
    monthStarts: [0, 100],
  });
  const visibleRight = scrollLeft + clientWidth;
  assert.ok(visibleRight >= todayLeft + todayWidth + 4);
});

test("scrollLeftToRevealToday returns 0 for bad inputs", () => {
  assert.equal(
    scrollLeftToRevealToday({
      scrollWidth: Number.NaN,
      clientWidth: 300,
      todayLeft: 10,
      todayWidth: 10,
      pitch: 13,
      monthStarts: [],
    }),
    0,
  );
});
