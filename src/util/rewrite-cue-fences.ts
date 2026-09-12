import type { FitnessSettings } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { cuePathForActivity } from "./activity-types.ts";

const DEDICATED_OPEN =
  /(^|\n)(```+|~~~+)(atomic-golf-cues|atomic-gym-cues)(?![A-Za-z0-9_-])([^\n]*)(\n|$)/g;

const DEDICATED_HOST_IDS = ["golf", "gym"] as const;

/** Rewrite `atomic-golf-cues` / `atomic-gym-cues` fences to `atomic-cues` + `activity:`. */
export function rewriteDedicatedCueFences(markdown: string): string {
  return String(markdown || "").replace(
    DEDICATED_OPEN,
    (_full, pre: string, fence: string, lang: string, rest: string, nl: string) => {
      const activity = lang === "atomic-golf-cues" ? "golf" : "gym";
      return `${pre}${fence}atomic-cues${rest}${nl}activity: ${activity}\n`;
    },
  );
}

/** Host notes that historically used dedicated golf/gym fences. */
export function dedicatedCueHostPaths(settings: FitnessSettings): string[] {
  const paths = new Set<string>();
  if (settings.golfCuesPath) paths.add(settings.golfCuesPath);
  if (settings.gymCuesPath) paths.add(settings.gymCuesPath);
  for (const id of DEDICATED_HOST_IDS) {
    const activity = settings.activityTypes.find((candidate) => candidate.id === id);
    if (activity?.supportsCues) paths.add(cuePathForActivity(activity));
  }
  return [...paths];
}
