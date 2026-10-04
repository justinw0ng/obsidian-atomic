import test from "node:test";
import assert from "node:assert/strict";
import { GREEN } from "../src/types.ts";
import { monthShortEn, monthShortZh } from "../src/dates.ts";
import {
  appendHeatmapWeeks,
  buildHeatmapWeeks,
  formatHeatmapTooltip,
  heatmapMonthPlacements,
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
  const pad = created.find((el) => el.className === "atomic-heat-cell is-pad");
  const cellTestIds = created.filter((el) => el.dataset.testid === "atomic-heatmap-cell");
  assert.ok(today);
  assert.ok(pad);
  assert.match(today.className, /atomic-heat-cell/);
  assert.match(today.className, /is-today/);
  assert.match(today.className, /is-link/);
  assert.equal(cellTestIds.length, 0);
  assert.equal(today.dataset.path, 'atomics/exercise/Gym/2026/a"b.md');
  assert.equal(today.dataset.minutes, "30");
  assert.equal(today.dataset.ymd, "2026-01-01");
  assert.equal(today.dataset.l, "2");
  const future = created.find((el) => String(el.className).includes("is-future"));
  assert.ok(future);
  assert.ok(future.dataset.ymd > "2026-01-01");
  assert.equal(String(today.className).includes("is-future"), false);
  assert.equal(future.dataset.l, undefined);
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
    String(el.className).includes("atomic-heat-cell"),
  );
  const today = created.filter((el) => el.dataset.testid === "atomic-heatmap-today");
  assert.ok(weeks.length >= 52);
  assert.ok(weeks.length <= 54);
  assert.equal(weeks.flat().length, cells.length);
  assert.equal(created.length, cells.length + 1);
  assert.equal(today.length, 1);
});

test("September 6 2026 sits under the 9月 span, not 10月", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-09-06",
    language: "zh-Hant-en",
    activityMap: new Map(),
  });
  const placements = heatmapMonthPlacements(weeks, "zh-Hant-en");
  assert.equal(placements.length, 12);
  const days = weeks.flat();
  const todayIndex = days.findIndex((day) => day.isToday);
  const today = days[todayIndex];
  assert.equal(today.date, "2026-09-06");
  assert.equal(today.m, 9);
  const todayWeek = Math.floor(todayIndex / 7) + 1;
  const september = placements.find((entry) => entry.month === 9);
  const october = placements.find((entry) => entry.month === 10);
  assert.equal(september.text, monthShortZh(2026, 9, 1));
  assert.ok(september.week <= todayWeek);
  assert.ok(october.week > todayWeek);
});

test("month labels mark the first week of each month", () => {
  const weeks = buildHeatmapWeeks({
    year: 2026,
    todayStr: "2026-09-06",
    language: "en",
    activityMap: new Map(),
  });
  const placements = heatmapMonthPlacements(weeks, "en");
  assert.equal(placements.length, 12);
  const september = placements.find((entry) => entry.month === 9);
  assert.equal(september.text, monthShortEn(2026, 9, 1));
  assert.ok(september.week >= 1);
  assert.ok(placements.every((entry, index) => index === 0 || entry.week > placements[index - 1].week));
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
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [new Map()] }), true);
  const other = new Map([["2026-01-01", { minutes: 40, path: "a.md" }]]);
  assert.equal(sameHeatmapPaintState(state, { ...state, maps: [other] }), false);
  assert.equal(
    sameHeatmapPaintState(
      { ...state, maps: [other] },
      { ...state, maps: [new Map([["2026-01-01", { minutes: 40, path: "a.md" }]])] },
    ),
    true,
  );
});
