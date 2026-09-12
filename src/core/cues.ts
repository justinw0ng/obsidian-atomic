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
  lastSeen: string;
};

/** `## 💡 Reminders`, `### Reminders / 提醒`, and plain `## Reminders`. */
const REMINDERS_HEADING = /^(#{1,6})\s+(?:\S+\s+)?Reminders(?:\s*\/\s*.+)?\s*$/i;
const HEADING = /^(#{1,6})\s+/;
const BULLET = /^\s*[-*+]\s+(.+)$/;
const EMPTY_BULLET = /^\s*[-*+]\s*$/;
const FENCE = /^\s*(`{3,}|~{3,})/;
/** Top-level Reminders bullets only. Indented markers stay inside a cue. */
const TOP_BULLET = /^ {0,1}[-*+](?:\s+(.*))?$/;
const CONTINUATION_INDENT = /^(?: {2}|\t)/;
const FENCE_PREFIX = /^[`~]{3,}\s*/;
const LEADING_BLOCK = /^(?:[-*+](?:\s+|$)|>\s*|#{1,6}(?:\s+|$))/;

/** Heading level used when this module has to create the section itself. */
const NEW_SECTION_LEVEL = "##";

type RemindersSection = {
  /** Index of the `## Reminders` line itself. */
  headingIndex: number;
  /** First line after the heading. */
  bodyStart: number;
  /** First line past the section: the next heading at or above its level. */
  end: number;
};

/**
 * Which lines sit inside a fenced block, delimiters included. Atomic's own
 * `atomic-cue-log` fence lives in the Reminders section and its option comments
 * start with `#`, so both reading and writing have to ignore fenced lines.
 */
function fencedLines(lines: readonly string[]): boolean[] {
  const fenced: boolean[] = [];
  let openedWith: string | null = null;
  for (const line of lines) {
    const delimiter = line.match(FENCE)?.[1];
    if (openedWith === null) {
      fenced.push(delimiter !== undefined);
      if (delimiter !== undefined) openedWith = delimiter;
      continue;
    }
    fenced.push(true);
    // CommonMark: the closing fence is the same character, and at least as long.
    const closes =
      delimiter !== undefined &&
      delimiter[0] === openedWith[0] &&
      delimiter.length >= openedWith.length;
    if (closes) openedWith = null;
  }
  return fenced;
}

/** The note's Reminders section, or null when it has none. */
function remindersSection(
  lines: readonly string[],
  fenced: readonly boolean[],
): RemindersSection | null {
  let headingIndex = -1;
  let level = 0;
  for (let index = 0; index < lines.length; index += 1) {
    if (fenced[index] || CONTINUATION_INDENT.test(lines[index])) continue;
    const match = lines[index].trim().match(REMINDERS_HEADING);
    if (!match) continue;
    headingIndex = index;
    level = match[1].length;
    break;
  }
  if (headingIndex === -1) return null;

  let end = lines.length;
  for (let index = headingIndex + 1; index < lines.length; index += 1) {
    if (fenced[index] || CONTINUATION_INDENT.test(lines[index])) continue;
    const heading = lines[index].trim().match(HEADING);
    if (heading && heading[1].length <= level) {
      end = index;
      break;
    }
  }
  return { headingIndex, bodyStart: headingIndex + 1, end };
}

export function normalizeCue(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

export function parseReminders(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const fenced = fencedLines(lines);
  const section = remindersSection(lines, fenced);
  if (!section) return [];

  const cues: string[] = [];
  let current: string[] | null = null;

  const flush = (): void => {
    if (!current) return;
    while (current.length && !current[current.length - 1].trim()) current.pop();
    while (current.length && !current[0].trim()) current.shift();
    if (current.length) cues.push(current.join("\n"));
    current = null;
  };

  for (let index = section.bodyStart; index < section.end; index += 1) {
    if (fenced[index]) {
      flush();
      continue;
    }
    const line = lines[index];
    const top = line.match(TOP_BULLET);
    if (top && !CONTINUATION_INDENT.test(line)) {
      flush();
      const body = (top[1] ?? "").trimEnd();
      current = body.trim() ? [body] : null;
      continue;
    }
    if (!current) continue;
    current.push(line.replace(CONTINUATION_INDENT, ""));
  }
  flush();
  return cues;
}

function stripFencePrefix(line: string): string {
  return line.replace(FENCE_PREFIX, "");
}

function stripLeadingBlocks(line: string): string {
  let stripped = stripFencePrefix(line).trim();
  let previous = "";
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripFencePrefix(stripped.replace(LEADING_BLOCK, "")).trim();
  }
  return stripped;
}

/**
 * Keep multiline markdown, but strip anything that would forge a sibling
 * bullet, a section heading, or a fence in the Reminders section. Continuation
 * lines may keep list markers so nested markdown still renders on the card.
 */
export function sanitizeCueText(text: string): string {
  const rawLines = text
    .replace(/\r\n/g, "\n")
    .replace(/[\u2028\u2029]/g, "\n")
    .split("\n");
  while (rawLines.length && !rawLines[0].trim()) rawLines.shift();
  while (rawLines.length && !rawLines[rawLines.length - 1].trim()) rawLines.pop();
  const cleaned = rawLines.map((line, index) =>
    index === 0 ? stripLeadingBlocks(line) : stripFencePrefix(line.trimEnd()).replace(/^\s+/, ""),
  );
  while (cleaned.length && !cleaned[0]) cleaned.shift();
  while (cleaned.length && !cleaned[cleaned.length - 1]) cleaned.pop();
  const collapsed: string[] = [];
  for (const line of cleaned) {
    if (!line && collapsed[collapsed.length - 1] === "") continue;
    collapsed.push(line);
  }
  return collapsed.join("\n");
}

/** One markdown list item: first line is the bullet, the rest stay indented. */
export function formatCueBullet(text: string): string {
  const lines = text.split("\n");
  const first = lines[0] ?? "";
  if (lines.length <= 1) return `- ${first}`;
  return [
    `- ${first}`,
    ...lines.slice(1).map((line) => (line.length ? `  ${line}` : "  ")),
  ].join("\n");
}

/**
 * Append a cue as the last bullet of the note's Reminders section, creating the
 * section when the note has none. Returns the markdown unchanged when the cue
 * sanitizes to nothing.
 */
export function appendCueBullet(
  markdown: string,
  cue: string,
  headingLabel: string,
): string {
  const text = sanitizeCueText(cue);
  if (!text) return ensureTrailingNewline(markdown);

  const bullet = formatCueBullet(text);
  const lines = markdown.split(/\r?\n/);
  const section = remindersSection(lines, fencedLines(lines));

  if (!section) {
    const base = trimBlankEdges(lines).join("\n");
    const heading = `${NEW_SECTION_LEVEL} ${headingLabel}`;
    return `${base}${base ? "\n\n" : ""}${heading}\n\n${bullet}\n`;
  }

  const body = trimBlankEdges(lines.slice(section.bodyStart, section.end));
  // Older session templates left a lone `- ` placeholder under the heading.
  // Replace that, but never a blank bullet a user wrote among real cues.
  const kept = body.length === 1 && EMPTY_BULLET.test(body[0]) ? [] : body;
  const last = kept[kept.length - 1];
  const separator = last !== undefined && !BULLET.test(last) ? [""] : [];

  return ensureTrailingNewline(
    [
      ...lines.slice(0, section.bodyStart),
      "",
      ...kept,
      ...separator,
      bullet,
      "",
      ...lines.slice(section.end),
    ].join("\n"),
  );
}

/**
 * Every cue of the year as one card, newest first, deduped by normalized text.
 * Repeats collapse into a single card that carries the repeat count. Cues that
 * share a date keep the order they appear in the note.
 */
export function buildCueCards(cues: readonly Cue[], year: number): CueCard[] {
  const prefix = `${year}-`;
  const byKey = new Map<string, CueCard>();
  const lastIndex = new Map<string, number>();
  const ordered = cues
    .filter((cue) => cue.date.startsWith(prefix))
    .slice()
    .sort((a, b) => a.date.localeCompare(b.date));

  ordered.forEach((cue, index) => {
    const key = normalizeCue(cue.text);
    if (!key) return;
    const card = byKey.get(key) ?? { key, text: "", focus: "", count: 0, lastSeen: "" };
    card.count += 1;
    card.text = cue.text.trim();
    card.focus = cue.focus || card.focus;
    card.lastSeen = cue.date;
    byKey.set(key, card);
    lastIndex.set(key, index);
  });

  return [...byKey.values()].sort(
    (a, b) =>
      b.lastSeen.localeCompare(a.lastSeen) ||
      (lastIndex.get(a.key) ?? 0) - (lastIndex.get(b.key) ?? 0),
  );
}

/** Does this heading label round-trip through the Reminders section scanner? */
export function isRemindersHeadingLabel(label: string): boolean {
  return REMINDERS_HEADING.test(`${NEW_SECTION_LEVEL} ${label}`);
}

function trimBlankEdges(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && !lines[start].trim()) start += 1;
  while (end > start && !lines[end - 1].trim()) end -= 1;
  return lines.slice(start, end);
}
