import type { VaultDataSource } from "../data/vault-source";
import { buildCueCards, sameCueCard, type Cue, type CueCard } from "../core/cues";
import { nowYear, resolveBlockYear } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, SessionMeta } from "../types";
import { resolveCueActivityType } from "../util/activity-types";
import { PaintMemo, sameList } from "../util/paint-memo";
import { appendCueCard, bindCueCardFan, type CueMarkdownHost } from "./cue-card";

type CuePagePaintState = {
  kind: "missing" | "cards";
  year: number;
  activity: string;
  language: Language;
  cards: readonly CueCard[];
};

const cuesPaint = new PaintMemo<CuePagePaintState>(
  '[data-testid="atomic-cues"]',
  (previous, next) =>
    !!previous &&
    previous.kind === next.kind &&
    previous.year === next.year &&
    previous.activity === next.activity &&
    previous.language === next.language &&
    sameList(previous.cards, next.cards, sameCueCard),
);

export function resolveCuesYear(
  opts: Record<string, string>,
  frontmatterYear: unknown,
  timezone: string,
): number {
  return resolveBlockYear(opts, nowYear(timezone), { frontmatterYear });
}

export async function renderCues(
  el: HTMLElement,
  data: VaultDataSource,
  activityTypes: ActivityType[],
  year: number,
  activity: string,
  language: Language,
  host: Omit<CueMarkdownHost, "component"> & {
    beginPaint: () => CueMarkdownHost["component"];
  },
): Promise<void> {
  const activityType = resolveCueActivityType(activityTypes, activity);
  if (!activityType) {
    const paintState: CuePagePaintState = {
      kind: "missing",
      year,
      activity,
      language,
      cards: [],
    };
    if (cuesPaint.shouldSkip(el, paintState)) return;
    host.beginPaint();
    el.empty();
    const root = el.createDiv({
      cls: "fitness-plugin atomic-cues",
      attr: { "data-testid": "atomic-cues", "data-activity": activity },
    });
    root.createEl("p", {
      text: t("view.cues.noCueActivity", language, { activity }),
      cls: "fitness-muted",
    });
    return;
  }

  const cards = buildCueCards(await collectCues(data, activityType, year), year);
  const paintState: CuePagePaintState = {
    kind: "cards",
    year,
    activity,
    language,
    cards,
  };
  if (cuesPaint.shouldSkip(el, paintState)) return;
  const component = host.beginPaint();
  el.empty();
  const root = el.createDiv({
    cls: "fitness-plugin atomic-cues",
    attr: { "data-testid": "atomic-cues", "data-activity": activity },
  });
  root.style.setProperty("--atomic-cue-accent", activityType.colors[2]);

  if (!cards.length) {
    root.createEl("p", {
      text: t("view.cues.empty", language, { year }),
      cls: "fitness-muted atomic-cues-empty",
    });
    return;
  }

  const fan = root.createDiv({ cls: "atomic-cue-fan" });
  const painted = await Promise.all(
    cards.map((card) =>
      appendCueCard(fan, card, { ...host, component }, language),
    ),
  );
  bindCueCardFan(painted);
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
