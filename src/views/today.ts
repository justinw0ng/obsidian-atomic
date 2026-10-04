import type { VaultDataSource } from "../data/vault-source";
import {
  extractYmdFromPath,
  parseYmd,
  weekdayDateForLanguage,
  ymdInZone,
} from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, DayActivity } from "../types";
import { exerciseActivities } from "../util/activity-types";
import { isStaleBlockRender } from "../util/block-render";
import { appendCatalogLabel, appendInlineCatalog } from "./catalog-label";

export function resolveTodayDate(
  opts: Record<string, string>,
  sourcePath: string,
  timezone: string,
): string {
  if (opts.date && parseYmd(opts.date)) return opts.date;
  const fromPath = extractYmdFromPath(sourcePath);
  if (fromPath) return fromPath;
  return ymdInZone(new Date(), timezone);
}

function sessionFromMap(
  map: Map<string, DayActivity> | undefined,
  dateStr: string,
): { minutes: number; path: string } | null {
  const entry = map?.get(dateStr);
  if (!entry || entry.minutes <= 0) return null;
  return { minutes: entry.minutes, path: entry.path ?? "" };
}

export async function renderTodaySessions(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  dateStr: string,
  language: Language,
  generation?: number,
): Promise<void> {
  const activities = exerciseActivities(activityTypes);
  const year = Number(dateStr.slice(0, 4));
  const maps = await Promise.all(
    activities.map((activity) => data.getActivityDurationMap(activity, year)),
  );
  if (generation !== undefined && isStaleBlockRender(el, generation)) return;

  el.empty();
  const rows = activities.map((activity, index) => ({
    activity,
    session: sessionFromMap(maps[index], dateStr),
  }));
  const done = rows.filter((row) => row.session).length;
  const parsed = parseYmd(dateStr);
  const dateLabel = parsed
    ? weekdayDateForLanguage(parsed.y, parsed.m, parsed.d, language)
    : dateStr;

  const root = el.createDiv({
    cls: "fitness-plugin atomic-today",
    attr: { "data-testid": "atomic-today" },
  });
  const head = root.createDiv({ cls: "atomic-section-head" });
  const titleWrap = head.createDiv();
  const caption = titleWrap.createDiv({ cls: "atomic-caption" });
  appendCatalogLabel(caption, t("view.today.title", language));
  const readout = head.createDiv({ cls: "atomic-readout" });
  appendCatalogLabel(
    readout,
    t("view.today.summary", language, {
      date: dateLabel,
      done,
      total: activities.length,
    }),
  );

  for (const { activity, session } of rows) {
    const line = root.createDiv({
      cls: session ? "atomic-recent-row atomic-today-row" : "atomic-recent-row atomic-today-row is-empty",
    });
    line.setCssProps({ "--atomic-c": activity.colors[2] });
    const name = line.createSpan({ cls: "atomic-name" });
    name.createSpan({ cls: "atomic-dot" });
    if (session?.path) {
      const link = name.createEl("a", {
        cls: "atomic-link",
        text: activity.label,
        attr: { href: "#" },
      });
      link.addEventListener("click", (event) => {
        event.preventDefault();
        void data.openPath(session.path);
      });
    } else {
      name.createSpan({ text: activity.label });
    }
    const sum = line.createSpan({ cls: "atomic-recent-sum" });
    if (session) {
      sum.createEl("strong", { text: String(session.minutes) });
      sum.appendText(" ");
      appendInlineCatalog(sum, t("view.dashboard.minuteWord", language));
    } else {
      sum.setText(t("view.today.noSession", language));
    }
    line.createSpan({ cls: "atomic-recent-arrow", text: session ? "→" : "" });
  }
}
