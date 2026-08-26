export function ensureTrailingNewline(markdown: string): string {
  const source = String(markdown || "");
  return source.endsWith("\n") ? source : `${source}\n`;
}
