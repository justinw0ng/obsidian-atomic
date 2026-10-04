export type CatalogLabel = {
  primary: string;
  secondary: string | null;
};

const LEADING_EMOJI =
  /^(\p{Extended_Pictographic}\uFE0F?(?:\u200D\p{Extended_Pictographic}\uFE0F?)*)\s+/u;

/**
 * Split one stored label written as "English / 中文".
 * Sentences with more than one slash stay on a single line.
 * Display uses {@link labelForLanguage} so only one half is painted.
 */
export function splitCatalogLabel(text: string): CatalogLabel {
  const match = /^([^/]+?) \/ ([^/]+)$/u.exec(text);
  if (!match) return { primary: text, secondary: null };
  const secondary = match[2];
  if (!secondary || !/\p{Script=Han}/u.test(secondary)) {
    return { primary: text, secondary: null };
  }
  return { primary: match[1] ?? text, secondary };
}

/** One language for a stored "English / 中文" label. Other strings stay as written. */
export function labelForLanguage(text: string, language: string): string {
  const { primary, secondary } = splitCatalogLabel(text);
  if (!secondary) return text;
  if (!language.startsWith("zh")) return primary.trim();
  const emoji = LEADING_EMOJI.exec(primary)?.[1] ?? "";
  const chinese = secondary.trim();
  return emoji ? `${emoji} ${chinese}` : chinese;
}

/**
 * Write a settings edit back into a stored "English / 中文" label.
 * The field shows one language. The other half stays until that language is edited.
 * An edit with no Han characters in Traditional Chinese replaces the whole label.
 */
export function applyLabelEdit(stored: string, edited: string, language: string): string {
  const next = edited.trim();
  if (!next) return stored;
  const { primary, secondary } = splitCatalogLabel(stored);
  if (!secondary) return next;
  const emoji = LEADING_EMOJI.exec(primary)?.[1] ?? "";
  const english = primary.replace(LEADING_EMOJI, "").trim();
  const prefix = emoji ? `${emoji} ` : "";
  if (language.startsWith("zh")) {
    if (!/\p{Script=Han}/u.test(next)) return next;
    const chinese = next.replace(LEADING_EMOJI, "").trim();
    return `${prefix}${english} / ${chinese}`;
  }
  const englishNext = next.replace(LEADING_EMOJI, "").trim();
  if (!englishNext) return stored;
  return `${prefix}${englishNext} / ${secondary.trim()}`;
}
