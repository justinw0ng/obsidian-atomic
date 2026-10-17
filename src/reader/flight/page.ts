/**
 * The spread the shell paints under the flight.
 * Destination text wins, so the overlay and the revealed page are the same leaf.
 */

export type OpenBookPage = {
  /** 1-based page the spread lands on. Journey frame 05e is 47. */
  page: number;
  headingLeft?: string;
  headingRight?: string;
  left: readonly string[];
  right: readonly string[];
};

export type PaintedPage = {
  page: number | null;
  lines: readonly string[];
};

export function spreadFromPainted(
  pages: readonly PaintedPage[],
  fallback: OpenBookPage,
): OpenBookPage {
  const painted = pages
    .map((page) => ({ page: page.page, lines: cleanLines(page.lines) }))
    .filter((page) => page.lines.length > 0);
  const leftPage = painted[0];
  const rightPage = painted[1];

  if (leftPage && rightPage) {
    const page = pageNumber(rightPage.page ?? leftPage.page, fallback.page);
    return withHeadings(page, leftPage.lines, rightPage.lines, fallback);
  }

  if (leftPage) {
    const page = pageNumber(leftPage.page, fallback.page);
    const combined = cleanLines([...fallback.left, ...fallback.right]);
    if (sameLines(leftPage.lines, combined)) {
      return withHeadings(
        page,
        cleanLines(fallback.left),
        cleanLines(fallback.right),
        fallback,
      );
    }
    const mid = Math.ceil(leftPage.lines.length / 2);
    return withHeadings(
      page,
      leftPage.lines.slice(0, mid),
      leftPage.lines.slice(mid),
      fallback,
    );
  }

  return {
    page: fallback.page,
    headingLeft: fallback.headingLeft,
    headingRight: fallback.headingRight,
    left: cleanLines(fallback.left),
    right: cleanLines(fallback.right),
  };
}

function withHeadings(
  page: number,
  left: readonly string[],
  right: readonly string[],
  fallback: OpenBookPage,
): OpenBookPage {
  const samePage = page === fallback.page;
  return {
    page,
    headingLeft: samePage ? fallback.headingLeft : undefined,
    headingRight: samePage ? fallback.headingRight ?? `p. ${page}` : `p. ${page}`,
    left,
    right,
  };
}

function cleanLines(lines: readonly string[]): string[] {
  return lines.map((line) => line.trim()).filter((line) => line.length > 0);
}

function sameLines(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((line, index) => line === b[index]);
}

function pageNumber(value: number | null, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
}
