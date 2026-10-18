import assert from "node:assert/strict";
import test from "node:test";
import {
  DESKTOP_BOOK_VIEWPORT_RATIO,
  PHONE_BOOK_VIEWPORT_RATIO,
  readerBookScale,
} from "../src/reader/shell/scale.ts";

test("desktop XL is 61/135 of the design window in both mockups", () => {
  assert.equal(DESKTOP_BOOK_VIEWPORT_RATIO, (680 * 488) / (1020 * 720));
  assert.equal(DESKTOP_BOOK_VIEWPORT_RATIO, 61 / 135);
});

test("phone card is the journey page share of the phone screen", () => {
  assert.equal(PHONE_BOOK_VIEWPORT_RATIO, (350 * 520) / (390 * 844));
});

test("the design window paints the XL tokens at zoom 1", () => {
  const fitted = readerBookScale({
    surface: "desk",
    viewportWidth: 1020,
    viewportHeight: 720,
    fieldWidth: 2000,
    fieldHeight: 2000,
  });
  assert.equal(fitted.scale, 1);
  assert.equal(fitted.clamped, false);
});

test("a larger window grows the book until it fills the same share", () => {
  const fitted = readerBookScale({
    surface: "desk",
    viewportWidth: 1920,
    viewportHeight: 1200,
    fieldWidth: 1800,
    fieldHeight: 1000,
  });
  const pageArea = 680 * fitted.scale * (488 * fitted.scale);
  const ratio = pageArea / (1920 * 1200);
  assert.ok(Math.abs(ratio - DESKTOP_BOOK_VIEWPORT_RATIO) < 0.002, String(ratio));
  assert.equal(fitted.clamped, false);
  assert.ok(fitted.scale > 1.7);
});

test("a short field clamps the zoom so the spread still fits", () => {
  const fitted = readerBookScale({
    surface: "desk",
    viewportWidth: 1920,
    viewportHeight: 1200,
    fieldWidth: 800,
    fieldHeight: 400,
  });
  assert.equal(fitted.clamped, true);
  assert.ok(fitted.scale * 904 <= 800 + 0.001);
  assert.ok(fitted.scale * 488 <= 400 - 16 + 0.001);
});

test("a phone screen paints the journey card area on the XL page", () => {
  const fitted = readerBookScale({
    surface: "phone",
    viewportWidth: 390,
    viewportHeight: 844,
    fieldWidth: 390,
    fieldHeight: 700,
  });
  const pageArea = 340 * fitted.scale * (488 * fitted.scale);
  const ratio = pageArea / (390 * 844);
  assert.ok(Math.abs(ratio - PHONE_BOOK_VIEWPORT_RATIO) < 0.002, String(ratio));
  assert.equal(fitted.clamped, false);
});

test("a missing viewport stays at zoom 1", () => {
  const fitted = readerBookScale({
    surface: "desk",
    viewportWidth: 0,
    viewportHeight: 720,
    fieldWidth: 900,
    fieldHeight: 600,
  });
  assert.equal(fitted.scale, 1);
  assert.equal(fitted.clamped, false);
});
