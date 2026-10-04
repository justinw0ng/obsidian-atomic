import type { Language } from "../i18n/types";

/**
 * One label per heatmap row. Weeks start on Sunday, matching `weekdaySun0`.
 * Single glyphs stay inside the 16px label column.
 */
export function heatmapWeekdayLabels(language: Language): readonly string[] {
  switch (language) {
    case "en":
      return ["S", "M", "T", "W", "T", "F", "S"];
    case "zh-Hant-en":
      return ["日", "一", "二", "三", "四", "五", "六"];
    default: {
      const exhaustive: never = language;
      return exhaustive;
    }
  }
}
