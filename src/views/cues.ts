import type { VaultDataSource } from "../data/vault-source";
import { buildCueCards, type Cue, type CueCard } from "../core";
import { nowYear, resolveBlockYear } from "../dates";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType, SessionMeta } from "../types";
import { resolveCueActivityType } from "../util/activity-types";

/** Paper tints cycle through four index-card stocks, like a real card pack. */
const CUE_STOCK_COUNT = 4;

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
  root.setAttr("data-cue-count", String(cards.length));
  if (activityType.baseColor) {
    root.style.setProperty("--atomic-cue-accent", activityType.baseColor);
  }

  if (!cards.length) {
    root.createEl("p", {
      text: t("view.cues.empty", language, { year }),
      cls: "fitness-muted atomic-cues-empty",
    });
    return;
  }

  const fan = root.createDiv({ cls: "atomic-cue-fan" });
  const buttons = cards.map((card, index) => appendCueCard(fan, card, index, language));
  // Touch devices have no hover, so a tap pops one card at a time.
  for (const button of buttons) {
    button.addEventListener("click", () => {
      const wasOpen = button.hasClass("is-open");
      for (const other of buttons) other.removeClass("is-open");
      if (!wasOpen) button.addClass("is-open");
    });
  }
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

function appendCueCard(
  fan: HTMLElement,
  card: CueCard,
  index: number,
  language: Language,
): HTMLButtonElement {
  // No aria-label: the cue and its meta row are the button's text, and an
  // aria-label would also raise an Obsidian tooltip over the popped card.
  const button = fan.createEl("button", {
    cls: "atomic-cue-card",
    attr: {
      type: "button",
      "data-testid": "atomic-cue-card",
      "data-cue-stock": String(index % CUE_STOCK_COUNT),
      "data-cue-repeats": String(card.count),
      "data-cue-last-seen": card.lastSeen,
    },
  });

  const sheet = button.createDiv({ cls: "atomic-cue-sheet" });
  const body = sheet.createDiv({ cls: "atomic-cue-body" });
  body.createEl("p", { cls: "atomic-cue-text", text: card.text });

  const meta = sheet.createDiv({ cls: "atomic-cue-meta" });
  meta.createSpan({
    cls: "atomic-cue-date",
    text: card.focus ? `${card.lastSeen} · ${card.focus}` : card.lastSeen,
  });
  if (card.count > 1) {
    meta.createSpan({
      cls: "atomic-cue-repeats",
      text: t("view.cues.repeats", language, { count: card.count }),
    });
  }

  return button;
}
