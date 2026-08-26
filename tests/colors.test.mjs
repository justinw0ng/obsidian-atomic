import test from "node:test";
import assert from "node:assert/strict";
import { BLUE, GREEN, ORANGE } from "../src/types.ts";
import {
  defaultBaseColorForDomain,
  expandHex,
  isHexColor,
  shadesFromBaseColor,
} from "../src/util/colors.ts";

test("shadesFromBaseColor returns exact built-in palettes for known bases", () => {
  assert.deepEqual(shadesFromBaseColor(GREEN[2]), GREEN);
  assert.deepEqual(shadesFromBaseColor(ORANGE[2]), ORANGE);
  assert.deepEqual(shadesFromBaseColor(BLUE[2]), BLUE);
});

test("shadesFromBaseColor is case-insensitive for built-in bases", () => {
  assert.deepEqual(shadesFromBaseColor(GREEN[2].toUpperCase()), GREEN);
});

test("shadesFromBaseColor generates four distinct hex shades with base at index 2", () => {
  const shades = shadesFromBaseColor("#cc3366");
  assert.equal(shades.length, 4);
  assert.equal(shades[2].toLowerCase(), "#cc3366");
  for (const shade of shades) {
    assert.match(shade, /^#[0-9a-f]{6}$/i);
  }
  assert.equal(new Set(shades.map((s) => s.toLowerCase())).size, 4);
});

test("shadesFromBaseColor falls back for invalid input", () => {
  assert.deepEqual(shadesFromBaseColor("not-a-color"), shadesFromBaseColor(GREEN[2]));
});

test("isHexColor accepts #rgb and #rrggbb", () => {
  assert.equal(isHexColor("#30a14e"), true);
  assert.equal(isHexColor("#fff"), true);
  assert.equal(isHexColor("30a14e"), false);
  assert.equal(isHexColor(""), false);
});

test("expandHex expands #rgb and falls back to the exercise base", () => {
  assert.equal(expandHex("#30a14e"), "#30a14e");
  assert.equal(expandHex("#fff"), "#ffffff");
  assert.equal(expandHex("not-a-color"), GREEN[2]);
});

test("defaultBaseColorForDomain returns built-in mid shades", () => {
  assert.equal(defaultBaseColorForDomain("exercise"), GREEN[2]);
  assert.equal(defaultBaseColorForDomain("hobby"), BLUE[2]);
});
