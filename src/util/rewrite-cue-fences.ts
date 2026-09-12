import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { cuePathForActivity } from "./activity-types.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { parseBlockOptions } from "./parse-block.ts";

const DEDICATED_CUE_ACTIVITY: Readonly<Record<string, string>> = {
  "atomic-golf-cues": "golf",
  "atomic-gym-cues": "gym",
};

const DEDICATED_OPEN =
  /(^|\n)(```+|~~~+)(atomic-golf-cues|atomic-gym-cues)(?![A-Za-z0-9_-])([^\n]*)(\n|$)/g;

export type DedicatedCueHostSettings = {
  activityTypes: ActivityType[];
  golfCuesPath: string;
  gymCuesPath: string;
};

export type CueFenceVault = {
  exists(path: string): boolean;
  readBody(path: string): Promise<string>;
  processNote(
    path: string,
    updater: (current: string) => string,
  ): Promise<unknown>;
};

function findClosingFence(
  source: string,
  bodyStart: number,
  fenceChar: string,
  minLen: number,
): number | null {
  const escaped = fenceChar.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const close = new RegExp(
    `(^|\\n)(${escaped}{${minLen},})[^\\S\\n]*(?=\\n|$)`,
  );
  const rest = source.slice(bodyStart);
  const found = close.exec(rest);
  if (!found) return null;
  return bodyStart + found.index;
}

/** Rewrite `atomic-golf-cues` / `atomic-gym-cues` fences to `atomic-cues` + `activity:`. */
export function rewriteDedicatedCueFences(markdown: string): string {
  const source = String(markdown || "");
  let out = "";
  let last = 0;
  for (const match of source.matchAll(DEDICATED_OPEN)) {
    const index = match.index ?? 0;
    const [, pre, fence, lang, rest, nl] = match;
    const activity = DEDICATED_CUE_ACTIVITY[lang];
    if (!activity) continue;
    const bodyStart = index + match[0].length;
    const bodyEnd =
      findClosingFence(source, bodyStart, fence[0] ?? "`", fence.length) ??
      source.length;
    const body = source.slice(bodyStart, bodyEnd);
    const nextBody = parseBlockOptions(body).activity
      ? body
      : `activity: ${activity}\n${body}`;
    out += source.slice(last, index);
    out += `${pre}${fence}atomic-cues${rest}${nl}`;
    out += nextBody;
    last = bodyEnd;
  }
  out += source.slice(last);
  return out;
}

/** Cue host notes that historically used dedicated golf/gym fences. */
export function dedicatedCueHostPaths(
  settings: DedicatedCueHostSettings,
): string[] {
  const paths = new Set<string>();
  for (const activity of settings.activityTypes) {
    if (activity.supportsCues) paths.add(cuePathForActivity(activity));
  }
  if (settings.golfCuesPath) paths.add(settings.golfCuesPath);
  if (settings.gymCuesPath) paths.add(settings.gymCuesPath);
  return [...paths];
}

/**
 * Rewrite dedicated cue fences on known host paths only. Missing notes are
 * skipped; unchanged notes are not written. Does not scan the vault.
 */
export async function migrateDedicatedCueHosts(
  data: CueFenceVault,
  settings: DedicatedCueHostSettings,
): Promise<string[]> {
  const rewritten: string[] = [];
  for (const path of dedicatedCueHostPaths(settings)) {
    if (!data.exists(path)) continue;
    const current = await data.readBody(path);
    const next = rewriteDedicatedCueFences(current);
    if (next === current) continue;
    await data.processNote(path, () => next);
    rewritten.push(path);
  }
  return rewritten;
}
