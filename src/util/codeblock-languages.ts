export const ATOMIC_CODEBLOCK_LANGUAGES: readonly string[] = [
  "atomic-heatmap",
  "atomic-today",
  "atomic-dashboard",
  "atomic-actions",
  "atomic-cues",
  "atomic-cue-log",
  "atomic-timer",
  "atomic-gym-log",
  "atomic-bookshelf",
];

export function codeblockLanguages(): string[] {
  return [...ATOMIC_CODEBLOCK_LANGUAGES];
}

export function resolveCueActivity(
  kind: string,
  options: Record<string, string>,
): string | null {
  if (kind !== "atomic-cues") return null;

  const activity = options.activity?.trim();
  return activity || null;
}
