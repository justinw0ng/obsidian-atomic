/** Pure update-note catalog and last-seen helpers — no Obsidian imports. */

import updateNoteJson from "./update-notes.json" with { type: "json" };
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isRecord } from "../util/record.ts";

export type UpdateNoteBodies = {
  en: string;
  "zh-Hant": string;
};

export type UpdateNote = {
  version: string;
  body: UpdateNoteBodies;
};

/** Unseen sentinel written by mergeSettings for stored settings that predate this field. */
export const UNSEEN_UPDATE_NOTE_VERSION = "0.0.0";

function nonEmptyText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text ? text : null;
}

export function parsePluginSemver(
  version: string,
): { major: number; minor: number; patch: number } | null {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(version.trim());
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

export function comparePluginSemver(a: string, b: string): number {
  const left = parsePluginSemver(a);
  const right = parsePluginSemver(b);
  if (!left || !right) {
    throw new Error(`Expected x.y.z semver, got: ${a} vs ${b}`);
  }
  if (left.major !== right.major) return left.major < right.major ? -1 : 1;
  if (left.minor !== right.minor) return left.minor < right.minor ? -1 : 1;
  if (left.patch !== right.patch) return left.patch < right.patch ? -1 : 1;
  return 0;
}

export function parseUpdateNote(raw: unknown): UpdateNote | null {
  if (!isRecord(raw)) return null;
  const version = typeof raw.version === "string" ? raw.version : "";
  if (!parsePluginSemver(version)) return null;
  if (!isRecord(raw.body)) return null;
  const en = nonEmptyText(raw.body.en);
  const zhHant = nonEmptyText(raw.body["zh-Hant"]);
  if (!en || !zhHant) return null;
  return { version, body: { en, "zh-Hant": zhHant } };
}

const parsedCatalog = parseUpdateNote(updateNoteJson);
if (!parsedCatalog) {
  throw new Error(
    "Invalid src/core/update-notes.json. Need version plus body.en and body.zh-Hant.",
  );
}

export const UPDATE_NOTE: UpdateNote = parsedCatalog;

export function updateNoteBodyForLanguage(
  note: UpdateNote,
  language: string,
): string {
  if (language.startsWith("zh-Hant")) return note.body["zh-Hant"];
  return note.body.en;
}

export function currentUpdateNote(
  note: UpdateNote,
  currentVersion: string,
): UpdateNote | null {
  const parsed = parseUpdateNote(note);
  if (!parsed || parsed.version !== currentVersion) return null;
  return parsed;
}

export function updateNoteToShow(options: {
  note: UpdateNote;
  lastSeenVersion: string;
  currentVersion: string;
}): UpdateNote | null {
  const latest = currentUpdateNote(options.note, options.currentVersion);
  if (!latest) return null;
  const lastSeen = options.lastSeenVersion.trim();
  if (!parsePluginSemver(lastSeen)) return null;
  if (comparePluginSemver(latest.version, lastSeen) <= 0) return null;
  return latest;
}

export function requiredUpdateNoteBodies(
  note: UpdateNote,
  version: string,
): UpdateNoteBodies {
  const current = currentUpdateNote(note, version);
  if (!current) {
    throw new Error(
      `Missing bilingual in-app update note for ${version}. Write body.en and body.zh-Hant in src/core/update-notes.json before cutting Release.`,
    );
  }
  return current.body;
}
