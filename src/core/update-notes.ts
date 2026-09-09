/** Pure update-note catalog and last-seen helpers — no Obsidian imports. */

export type UpdateNote = {
  version: string;
  body: string;
};

/**
 * In-app update notes keyed by plugin semver.
 * Every shipped version must have a non-empty body here. One note may
 * summarize multiple PRs since the previous release. Release / agents
 * write the next version's entry before or while cutting Release.
 */
export const UPDATE_NOTES: Record<string, string> = {
  "1.1.8": "After this update, Atomic Tracker shows a What's new note when the plugin version changes. Later releases summarize changes since the previous version. One note can cover several pull requests."
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

function trimmedNoteBody(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function latestUpdateNoteAtOrBefore(
  notes: Record<string, string>,
  currentVersion: string,
): UpdateNote | null {
  if (!parsePluginSemver(currentVersion)) return null;
  let latest: UpdateNote | null = null;
  for (const [version, rawBody] of Object.entries(notes)) {
    if (!parsePluginSemver(version)) continue;
    const body = trimmedNoteBody(rawBody);
    if (!body) continue;
    if (comparePluginSemver(version, currentVersion) > 0) continue;
    if (!latest || comparePluginSemver(version, latest.version) > 0) {
      latest = { version, body };
    }
  }
  return latest;
}

export function updateNoteToShow(options: {
  notes: Record<string, string>;
  lastSeenVersion: string;
  currentVersion: string;
  hadStoredSettings: boolean;
}): UpdateNote | null {
  const latest = latestUpdateNoteAtOrBefore(
    options.notes,
    options.currentVersion,
  );
  if (!latest) return null;

  const lastSeen = options.lastSeenVersion.trim();
  if (!lastSeen || !parsePluginSemver(lastSeen)) {
    return options.hadStoredSettings ? latest : null;
  }
  if (comparePluginSemver(latest.version, lastSeen) <= 0) return null;
  return latest;
}

export function requiredUpdateNoteBody(
  notes: Record<string, string>,
  version: string,
): string {
  const body = trimmedNoteBody(notes[version]);
  if (!body) {
    throw new Error(
      `Missing in-app update note for ${version}. Add a non-empty entry to UPDATE_NOTES before cutting Release.`,
    );
  }
  return body;
}
