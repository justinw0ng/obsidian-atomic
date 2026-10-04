export type CatalogLabel = {
  primary: string;
  secondary: string | null;
};

/**
 * Split one catalog label written as "English / 中文".
 * Sentences with more than one slash stay on a single line.
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
