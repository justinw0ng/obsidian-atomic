import test from "node:test";
import assert from "node:assert/strict";
import { GREEN } from "../src/types.ts";
import { monthShortEn, monthShortZh } from "../src/dates.ts";
import {
  appendHeatmapWeeks,
  buildHeatmapWeeks,
  formatHeatmapTooltip,
  heatmapMonthSlots,
  sameHeatmapPaintState,
} from "../src/util/heatmap-model.ts";

test("buildHeatmapWeeks marks today and session minutes", () => {
  const activityMap = new Map([
    ["2026-01-01", { minutes: 45, path: "atomics/exercise/Gym/2026/2026-01-01.md" }],
  ]);
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-01-01",
    language: "en",
    activityMap,
  });
  const days = weeks.flat();
  const today = days.find((day) => day.isToday && day.isCurrentYear);
  assert.ok(today);
  assert.equal(today.minutes, 45);
  assert.equal(today.path, "atomics/exercise/Gym/2026/2026-01-01.md");
  assert.equal(today.level, 2);
  assert.ok(weeks.length >= 52);
  assert.ok(weeks.length <= 54);
});

function createPaintHost() {
  const created = [];
  function makeEl(className = "") {
    const el = {
      className,
      style: { backgroundColor: "" },
      dataset: {},
      children: [],
      createDiv(options = {}) {
        const child = makeEl(options.cls ?? "");
        for (const [key, value] of Object.entries(options.attr ?? {})) {
          if (key.startsWith("data-")) {
            const dataKey = key
              .slice(5)
              .replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
            child.dataset[dataKey] = String(value);
          }
        }
        this.children.push(child);
        return child;
      },
    };
    created.push(el);
    return el;
  }
  return { parent: makeEl(), created };
}

test("appendHeatmapWeeks paints cells with dataset hooks", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-01-01",
    language: "en",
    activityMap: new Map([
      [
        "2026-01-01",
        {
          minutes: 30,
          path: 'atomics/exercise/Gym/2026/a"b.md',
        },
      ],
    ]),
  });
  const { parent, created } = createPaintHost();
  appendHeatmapWeeks(
    parent,
    weeks,
    GREEN,
    "{date}: {minutes} min",
    "{date}: {minutes} min - click to open",
  );
  const today = created.find((el) => el.dataset.testid === "atomic-heatmap-today");
  const pad = created.find((el) => el.className === "fitness-weeks-end-pad");
  const todayWeek = created.find((el) => el.className.includes("is-today-week"));
  const cellTestIds = created.filter((el) => el.dataset.testid === "atomic-heatmap-cell");
  assert.ok(today);
  assert.ok(pad);
  assert.ok(todayWeek);
  assert.equal(cellTestIds.length, 0);
  assert.equal(today.dataset.path, 'atomics/exercise/Gym/2026/a"b.md');
  assert.equal(today.dataset.minutes, "30");
  assert.equal(today.dataset.ymd, "2026-01-01");
  assert.equal(parent.children.at(-1), pad);
});

test("appendHeatmapWeeks keeps year-grid DOM volume bounded", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-09-08",
    language: "en",
    activityMap: new Map(),
  });
  const { created } = createPaintHost();
  const host = created[0];
  appendHeatmapWeeks(
    host,
    weeks,
    GREEN,
    "{date}: {minutes} min",
    "{date}: {minutes} min - click to open",
  );
  const cells = created.filter((el) =>
    String(el.className).includes("fitness-cell"),
  );
  const today = created.filter((el) => el.dataset.testid === "atomic-heatmap-today");
  assert.ok(weeks.length >= 52);
  assert.ok(weeks.length <= 54);
  assert.equal(weeks.flat().length, cells.length);
  assert.ok(
    created.length <= weeks.length * 8 + 5,
    `week painter used ${created.length} nodes for ${weeks.length} weeks`,
  );
  assert.equal(today.length, 1);
});

test("September 6 2026 sits under 9月, not 10月", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-09-06",
    language: "zh-Hant-en",
    activityMap: new Map(),
  });
  const slots = heatmapMonthSlots(weeks, "zh-Hant-en");
  assert.equal(slots.length, weeks.length);
  const todayIndex = weeks.findIndex((week) => week.some((day) => day.isToday));
  assert.ok(todayIndex >= 0);
  const today = weeks[todayIndex].find((day) => day.isToday);
  assert.equal(today.date, "2026-09-06");
  assert.equal(today.m, 9);
  const slot = slots[todayIndex];
  assert.equal(slot.kind, "label");
  assert.equal(slot.month, 9);
  assert.equal(slot.text, monthShortZh(2026, 9, 6));
  const octoberIndex = slots.findIndex(
    (entry) => entry.kind === "label" && entry.month === 10,
  );
  assert.ok(octoberIndex > todayIndex);
});

test("month slots keep one column per week for English labels", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-09-06",
    language: "en",
    activityMap: new Map(),
  });
  const slots = heatmapMonthSlots(weeks, "en");
  assert.equal(slots.length, weeks.length);
  const todayIndex = weeks.findIndex((week) => week.some((day) => day.isToday));
  assert.equal(slots[todayIndex].kind, "label");
  assert.equal(slots[todayIndex].month, 9);
  assert.equal(slots[todayIndex].text, monthShortEn(2026, 9, 6));
});

test("heatmap tooltip formatting stays literal", () => {
  assert.equal(
    formatHeatmapTooltip("{date}: {minutes} min", "Jan 1, 2026", 12),
    "Jan 1, 2026: 12 min",
  );
});

test("sameHeatmapPaintState reuses identical duration maps", () => {
  const map = new Map();
  const state = {
    year: 2026,
    timezone: "UTC",
    language: "en",
    layoutKey: "1:1:300:1.2",
    activityKey: "gym",
    invalidIds: [],
    maps: [map],
  };
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [map] }), true);
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [new Map()] }), false);
});
