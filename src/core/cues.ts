/** Pure cue domain logic — no Obsidian imports. */

// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { ensureTrailingNewline } from "../util/markdown.ts";

export type Cue = { text: string; date: string; focus?: string };

/** One index card: a cue deduped across the year, with how often it came back. */
export type CueCard = {
  key: string;
  text: string;
  focus: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
};

/** `## 💡 Reminders`, `## Reminders / 提醒`, and plain `## Reminders`. */
const REMINDERS_HEADING = /^##\s+(?:\S+\s+)?Reminders(?:\s*\/\s*.+)?\s*$/i;
const ANY_HEADING = /^(#{1,6})\s+/;
const BULLET = /^\s*[-*+]\s+(.+)$/;
const EMPTY_BULLET = /^\s*[-*+]\s*$/;

export function normalizeCue(text: string): string {
  return String(text || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

export function parseReminders(markdown: string): string[] {
  const lines = String(markdown).split(/\r?\n/);
  const out: string[] = [];
  let inRem = false;
  for (const line of lines) {
    if (REMINDERS_HEADING.test(line.trim())) {
      inRem = true;
      continue;
    }
    if (inRem && /^##\s+/.test(line)) break;
    if (inRem) {
      const m = line.match(BULLET);
      if (m) out.push(m[1].trim());
    }
  }
  return out;
}

/**
 * Flatten a cue to one markdown bullet's worth of text. Newlines, list markers,
 * and blockquote markers are stripped so typed input cannot forge extra bullets
 * or headings in the Reminders section.
 */
export function sanitizeCueText(text: string): string {
  const flat = String(text ?? "")
    .replace(/[\r\n\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  let stripped = flat;
  let previous = "";
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripped
      .replace(/^(?:[-*+](?:\s+|$)|>\s*|#{1,6}(?:\s+|$))/, "")
      .trim();
  }
  return stripped;
}

/**
 * Append a cue as a bullet in the note's Reminders section, creating the
 * section when the note has none. Returns the markdown unchanged when the cue
 * sanitizes to nothing.
 */
export function appendCueBullet(
  markdown: string,
  cue: string,
  headingLabel: string,
): string {
  const text = sanitizeCueText(cue);
  const source = String(markdown ?? "");
  if (!text) return ensureTrailingNewline(source);

  const bullet = `- ${text}`;
  const lines = source.split(/\r?\n/);
  const headingIndex = lines.findIndex((line) => REMINDERS_HEADING.test(line.trim()));

  if (headingIndex === -1) {
    const base = trimTrailingBlankLines(lines).join("\n");
    const heading = `## ${headingLabel}`;
    return `${base}${base ? "\n\n" : ""}${heading}\n\n${bullet}\n`;
  }

  const headingLevel = lines[headingIndex].match(ANY_HEADING)?.[1].length ?? 2;
  let sectionEnd = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    const heading = lines[index].match(ANY_HEADING);
    if (heading && heading[1].length <= headingLevel) {
      sectionEnd = index;
      break;
    }
  }

  // Empty `- ` lines are the placeholder older session templates left behind.
  const body = trimTrailingBlankLines(
    lines
      .slice(headingIndex + 1, sectionEnd)
      .filter((line) => !EMPTY_BULLET.test(line)),
  );

  return ensureTrailingNewline(
    [
      ...lines.slice(0, headingIndex + 1),
      ...(body.length ? body : [""]),
      bullet,
      "",
      ...lines.slice(sectionEnd),
    ].join("\n"),
  );
}

/**
 * Every cue of the year as one card, newest first, deduped by normalized text.
 * Repeats collapse into a single card that carries the repeat count.
 */
export function buildCueCards(cues: readonly Cue[], year: number): CueCard[] {
  const prefix = `${year}-`;
  const byKey = new Map<string, CueCard>();
  const ordered = cues
    .filter((cue) => String(cue.date || "").startsWith(prefix))
    .slice()
    .sort((a, b) => String(a.date).localeCompare(String(b.date)));

  for (const cue of ordered) {
    const key = normalizeCue(cue.text);
    if (!key) continue;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, {
        key,
        text: String(cue.text).trim(),
        focus: cue.focus || "",
        count: 1,
        firstSeen: cue.date,
        lastSeen: cue.date,
      });
      continue;
    }
    previous.count += 1;
    previous.text = String(cue.text).trim();
    previous.focus = cue.focus || previous.focus;
    previous.lastSeen = cue.date;
  }

  return [...byKey.values()].sort(
    (a, b) =>
      b.lastSeen.localeCompare(a.lastSeen) ||
      b.count - a.count ||
      a.key.localeCompare(b.key),
  );
}

function trimTrailingBlankLines(lines: string[]): string[] {
  const out = lines.slice();
  while (out.length && !out[out.length - 1].trim()) out.pop();
  return out;
}
