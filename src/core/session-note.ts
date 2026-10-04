/** Pure session-note markdown builders — no Obsidian imports. */

// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { MUSCLES } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { labelForLanguage } from "../util/bilingual-label.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { yamlScalar } from "../util/yaml.ts";

function sessionHeading(activity: ActivityType, date: string, language: Language): string {
  return `# ${labelForLanguage(activity.label, language)} — ${date}`;
}

export function gymBody(
  activity: ActivityType,
  date: string,
  location: string,
  locationDetail: string,
  weightUnit: string,
  language: Language,
): string {
  const muscleHints = MUSCLES.map((muscle) => t(`muscle.${muscle}`, language));
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

${sessionHeading(activity, date, language)}

<!-- 💪 ${t("template.gymMuscles", language)}: ${muscleHints.join(", ")} -->

${defaultAtomicBlockFence("atomic-timer", language)}
${defaultAtomicBlockFence("atomic-gym-log", language)}
| ${t("template.gymTable.exercise", language)} | ${t("template.gymTable.muscle", language)} | ${t("template.gymTable.weight", language)} | ${t("template.gymTable.reps", language)} | ${t("template.gymTable.notes", language)} |
| --- | --- | --- | --- | --- |
${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}

export function golfBody(activity: ActivityType, date: string, language: Language): string {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location:
focus: []
club: []
felt:
---

${sessionHeading(activity, date, language)}

<!-- ${t("template.golfLocationHint", language)} -->
<!-- ${t("template.golfFocusHint", language)} -->
<!-- ${t("template.golfClubHint", language)} -->
<!-- ${t("template.golfFeltHint", language)} -->

${defaultAtomicBlockFence("atomic-timer", language)}${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}

export function genericExerciseBody(
  activity: ActivityType,
  date: string,
  language: Language,
): string {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
timer_started_at:
location:
---

${sessionHeading(activity, date, language)}

${defaultAtomicBlockFence("atomic-timer", language)}${activity.supportsCues ? `
## ${t("template.reminders", language)}

${defaultAtomicBlockFence("atomic-cue-log", language)}` : ""}
`;
}
