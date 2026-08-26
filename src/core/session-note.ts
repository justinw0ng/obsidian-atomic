/** Pure session-note markdown builders — no Obsidian imports. */

// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { MUSCLES } from "../core.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { t, type Language } from "../i18n/index.ts";
import type { ActivityType } from "../types";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { defaultAtomicBlockFence } from "../util/codeblock-defaults.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { yamlScalar } from "../util/yaml.ts";

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
location: ${yamlScalar(location)}
location_detail: ${yamlScalar(locationDetail)}
weight_unit: ${weightUnit}
---

# ${activity.label} — ${date}

<!-- 💪 ${t("template.gymMuscles", language)}: ${muscleHints.join(", ")} -->

${defaultAtomicBlockFence("atomic-gym-log", language)}
| ${t("template.gymTable.exercise", language)} | ${t("template.gymTable.muscle", language)} | ${t("template.gymTable.weight", language)} | ${t("template.gymTable.reps", language)} | ${t("template.gymTable.notes", language)} |
| --- | --- | --- | --- | --- |
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}

export function golfBody(activity: ActivityType, date: string, language: Language): string {
  return `---
type: session
date: ${date}
activity: ${yamlScalar(activity.id)}
duration_min:
location:
focus: []
club: []
felt:
---

# ${activity.label} — ${date}

<!-- ${t("template.golfLocationHint", language)} -->
<!-- ${t("template.golfFocusHint", language)} -->
<!-- ${t("template.golfClubHint", language)} -->
<!-- ${t("template.golfFeltHint", language)} -->
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
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
location:
---

# ${activity.label} — ${date}
${activity.supportsCues ? `
## ${t("template.reminders", language)}

- 
` : ""}
`;
}
