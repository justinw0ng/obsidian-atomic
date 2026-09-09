/** Pure update-note catalog and last-seen helpers — no Obsidian imports. */

import updateNoteJson from "./update-notes.json" with { type: "json" };

export type UpdateNote = {
  version: string;
  body: string;
};

/** Unseen sentinel written by mergeSettings for stored settings that predate this field. */
export const UNSEEN_UPDATE_NOTE_VERSION = "0.0.0";

export const UPDATE_NOTE: UpdateNote = {
  version: updateNoteJson.version,
  body: updateNoteJson.body,
};

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

export function currentUpdateNote(
  note: UpdateNote,
  currentVersion: string,
): UpdateNote | null {
  const body = note.body.trim();
  if (!body) return null;
  if (!parsePluginSemver(note.version)) return null;
  if (note.version !== currentVersion) return null;
  return { version: note.version, body };
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

export function requiredUpdateNoteBody(
  note: UpdateNote,
  version: string,
): string {
  const current = currentUpdateNote(note, version);
  if (!current) {
    throw new Error(
      `Missing in-app update note for ${version}. Write src/core/update-notes.json before cutting Release.`,
    );
  }
  return current.body;
}
