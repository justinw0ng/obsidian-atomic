export type PdfInfo = {
  pages: number;
  encrypted: boolean;
};

export function inspectPdf(bytes: Uint8Array): PdfInfo {
  const text = new TextDecoder("iso-8859-1").decode(bytes);
  const encrypted = /\/Encrypt\b/.test(text);
  let pages = 0;
  const patterns = [
    /\/Type\s*\/Pages\b[\s\S]{0,80}?\/Count\s+(\d+)/g,
    /\/Count\s+(\d+)[\s\S]{0,80}?\/Type\s*\/Pages\b/g,
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const count = Number(match[1]);
      if (Number.isFinite(count) && count > pages) pages = Math.trunc(count);
    }
  }
  return { pages, encrypted };
}

/** Chromium's built-in PDF viewer (Obsidian's engine). No second PDF stack. */
export function pdfViewerSrc(resourcePath: string, page: number): string {
  const base = resourcePath.split("#")[0] ?? resourcePath;
  const safe = Math.max(1, Math.trunc(page));
  return `${base}#page=${safe}&toolbar=0&navpanes=0&view=FitH`;
}
