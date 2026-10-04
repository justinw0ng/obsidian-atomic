import assert from "node:assert/strict";
import test from "node:test";
import { isFutureMonth, stackedMonthPeak } from "../src/util/month-chart.ts";

test("stacked columns scale to the peak monthly sum", () => {
  assert.equal(stackedMonthPeak([[10, 4], [8, 1]]), 18);
  assert.equal(stackedMonthPeak([[0, 0], [0, 0]]), 1);
  assert.equal(stackedMonthPeak([]), 1);
});

test("future months follow the viewed year and the timezone calendar", () => {
  const october = new Date("2026-10-04T12:00:00Z");
  assert.equal(isFutureMonth(2026, 9, "UTC", october), false);
  assert.equal(isFutureMonth(2026, 10, "UTC", october), true);
  assert.equal(isFutureMonth(2025, 11, "UTC", october), false);
  assert.equal(isFutureMonth(2027, 0, "UTC", october), true);

  const novemberInHongKong = new Date("2026-10-31T20:00:00Z");
  assert.equal(isFutureMonth(2026, 10, "UTC", novemberInHongKong), true);
  assert.equal(isFutureMonth(2026, 9, "Asia/Hong_Kong", novemberInHongKong), false);
  assert.equal(isFutureMonth(2026, 10, "Asia/Hong_Kong", novemberInHongKong), false);
  assert.equal(isFutureMonth(2026, 11, "Asia/Hong_Kong", novemberInHongKong), true);
});
