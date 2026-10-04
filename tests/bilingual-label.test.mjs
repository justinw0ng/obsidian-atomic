import assert from "node:assert/strict";
import test from "node:test";
import { splitCatalogLabel } from "../src/util/bilingual-label.ts";

test("splitCatalogLabel stacks a single English / Chinese catalog label", () => {
  assert.deepEqual(splitCatalogLabel("Exercise sessions / 運動次數"), {
    primary: "Exercise sessions",
    secondary: "運動次數",
  });
});

test("splitCatalogLabel leaves English and multi-slash sentences intact", () => {
  assert.deepEqual(splitCatalogLabel("Exercise sessions"), {
    primary: "Exercise sessions",
    secondary: null,
  });
  assert.deepEqual(splitCatalogLabel("Total / 總計: 40 min / 分鐘"), {
    primary: "Total / 總計: 40 min / 分鐘",
    secondary: null,
  });
  assert.deepEqual(splitCatalogLabel("good / ok"), {
    primary: "good / ok",
    secondary: null,
  });
});
