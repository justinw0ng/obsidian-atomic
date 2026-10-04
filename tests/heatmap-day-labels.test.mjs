import test from "node:test";
import assert from "node:assert/strict";
import { heatmapWeekdayLabels } from "../src/util/heatmap-day-labels.ts";

test("heatmap weekday labels name every row, Sunday first", () => {
  assert.deepEqual(heatmapWeekdayLabels("en"), ["S", "M", "T", "W", "T", "F", "S"]);
  assert.deepEqual(heatmapWeekdayLabels("zh-Hant-en"), [
    "日",
    "一",
    "二",
    "三",
    "四",
    "五",
    "六",
  ]);
  assert.equal(heatmapWeekdayLabels("en").length, 7);
  assert.ok(heatmapWeekdayLabels("en").every((mark) => mark.length === 1));
});
