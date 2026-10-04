import test from "node:test";
import assert from "node:assert/strict";
import {
  scrollLeftToAlignRight,
  scrollLeftToRevealToday,
} from "../src/util/heatmap-scroll.ts";

test("scrollLeftToAlignRight aligns mid-year target to right edge", () => {
  // scrollWidth=1000, clientWidth=300 → max scrollLeft=700
  // targetRightPx=500 → desired scrollLeft=500-300=200
  assert.equal(scrollLeftToAlignRight(1000, 300, 500), 200);
});

test("scrollLeftToAlignRight returns 0 when content does not overflow", () => {
  assert.equal(scrollLeftToAlignRight(200, 300, 150), 0);
});

test("scrollLeftToAlignRight clamps when target is past max scroll", () => {
  // targetRightPx=1200 → desired=900, max=700
  assert.equal(scrollLeftToAlignRight(1000, 300, 1200), 700);
});

test("scrollLeftToAlignRight clamps when target is before viewport", () => {
  // targetRightPx=100 → desired=-200 → 0
  assert.equal(scrollLeftToAlignRight(1000, 300, 100), 0);
});

test("scrollLeftToAlignRight returns 0 when scrollWidth equals clientWidth", () => {
  assert.equal(scrollLeftToAlignRight(300, 300, 250), 0);
});

test("scrollLeftToAlignRight returns 0 for non-finite or negative sizes", () => {
  assert.equal(scrollLeftToAlignRight(NaN, 300, 500), 0);
  assert.equal(scrollLeftToAlignRight(1000, Infinity, 500), 0);
  assert.equal(scrollLeftToAlignRight(-100, 300, 500), 0);
  assert.equal(scrollLeftToAlignRight(1000, -50, 500), 0);
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
    256,
  );
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
