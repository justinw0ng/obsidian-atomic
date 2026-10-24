export type ReaderBlock = {
  kind: "heading" | "paragraph";
  text: string;
};

export type ReaderLeaf = {
  number: number;
  chapter: string;
  paragraphs: string[];
};

function wordsOf(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function countReaderLines(text: string, charsPerLine: number): number {
  const width = Math.max(1, charsPerLine);
  const words = wordsOf(text);
  if (!words.length) return 1;
  let lines = 1;
  let length = 0;
  for (const word of words) {
    const add = length === 0 ? word.length : word.length + 1;
    if (length > 0 && length + add > width) {
      lines += 1;
      length = word.length;
    } else {
      length += add;
    }
  }
  return lines;
}

function splitToFit(text: string, charsPerLine: number, bodyLines: number): string[] {
  const width = Math.max(1, charsPerLine);
  const limit = Math.max(1, bodyLines);
  if (countReaderLines(text, width) <= limit) return [text];
  const words = wordsOf(text);
  const pieces: string[] = [];
  let current: string[] = [];
  let lines = 1;
  let length = 0;
  const push = (): void => {
    if (current.length) pieces.push(current.join(" "));
    current = [];
    lines = 1;
    length = 0;
  };
  for (const word of words) {
    const add = length === 0 ? word.length : word.length + 1;
    if (length > 0 && length + add > width) {
      if (lines >= limit) push();
      else lines += 1;
      current.push(word);
      length = word.length;
      continue;
    }
    current.push(word);
    length += add;
  }
  push();
  return pieces.length ? pieces : [text];
}

/**
 * Pack paragraphs into fixed desktop pages. A heading starts a new page.
 * Phone layout stacks the same spread; it does not paginate again.
 */
export function paginateReaderBlocks(
  blocks: readonly ReaderBlock[],
  box: { bodyLines: number; charsPerLine: number },
): ReaderLeaf[] {
  const bodyLines = Math.max(1, box.bodyLines);
  const charsPerLine = Math.max(1, box.charsPerLine);
  const pages: ReaderLeaf[] = [];
  let chapter = "";
  let pageChapter = "";
  let paragraphs: string[] = [];
  let used = 0;

  const flush = (): void => {
    if (!paragraphs.length) return;
    pages.push({
      number: pages.length + 1,
      chapter: pageChapter,
      paragraphs,
    });
    paragraphs = [];
    used = 0;
  };

  const appendPiece = (piece: string): void => {
    const lines = countReaderLines(piece, charsPerLine);
    const gap = paragraphs.length ? 1 : 0;
    if (paragraphs.length && used + gap + lines > bodyLines) flush();
    if (!paragraphs.length) pageChapter = chapter;
    const gapNow = paragraphs.length ? 1 : 0;
    paragraphs.push(piece);
    used += gapNow + lines;
  };

  for (const block of blocks) {
    const text = block.text.trim();
    if (!text) continue;
    if (block.kind === "heading") {
      flush();
      chapter = text;
      continue;
    }
    for (const piece of splitToFit(text, charsPerLine, bodyLines)) {
      appendPiece(piece);
    }
  }
  flush();
  return pages;
}
