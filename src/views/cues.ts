import type FitnessPlugin from "../main";
import type { VaultDataSource } from "../data/vault-source";
import { buildCueCards, type Cue } from "../core/cues";
import { nowYear, resolveBlockYear } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, SessionMeta } from "../types";
import { resolveCueActivityType } from "../util/activity-types";
import { appendCueCard, bindCueCardFan } from "./cue-card";

export function resolveCuesYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear });
}

export async function renderCues(
  el: HTMLElement,
  plugin: FitnessPlugin,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  activity: string,
  language: Language,
  sourcePath: string,
): Promise<void> {
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cues",
    attr: { "data-testid": "atomic-cues", "data-activity": activity },
  });

  const activityType = resolveCueActivityType(activityTypes, activity);
  if (!activityType) {
    root.createEl("p", {
      text: t("view.cues.noCueActivity", language, { activity }),
      cls: "fitness-muted",
    });
    return;
  }

  const cards = buildCueCards(await collectCues(data, activityType, year), year);
  root.style.setProperty("--atomic-cue-accent", activityType.colors[2]);

  if (!cards.length) {
    root.createEl("p", {
      text: t("view.cues.empty", language, { year }),
      cls: "fitness-muted atomic-cues-empty",
    });
    return;
  }

  const fan = root.createDiv({ cls: "atomic-cue-fan" });
  const buttons = await Promise.all(
    cards.map((card) => appendCueCard(fan, card, plugin, sourcePath, language)),
  );
  bindCueCardFan(buttons);
}

async function collectCues(
  data: VaultDataSource,
  activityType: ActivityType,
  year: number,
): Promise<Cue[]> {
  const sessions = await Promise.all(
    data
      .listSessions(activityType.folder, year)
      .filter((session): session is SessionMeta & { date: string } => !!session.date)
      .map(async (session) => ({
        session,
        reminders: await data.getSessionReminders(session.path),
      })),
  );

  const cues: Cue[] = [];
  for (const { session, reminders } of sessions) {
    const focus = session.focus.join(", ");
    for (const text of reminders) {
      if (!text) continue;
      cues.push({ text, date: session.date, focus });
    }
  }
  return cues;
}
