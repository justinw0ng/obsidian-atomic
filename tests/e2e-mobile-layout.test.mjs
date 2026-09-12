import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  BOOK_GAP_PX,
  DEFAULT_BOOK_HEIGHT_PX,
  DEFAULT_BOOK_WIDTH_PX,
  MIN_BOOK_WIDTH_PX,
  MIN_BOOKS_PER_ROW,
  ROW_PADDING_PX,
  bookHeightForWidth,
  bookWidthForContainer,
  booksPerRow,
  chunkItems,
  resolveBookShelfScale,
  rowNeedsHorizontalScroll,
  scaledBookSize,
} from "../src/util/book-shelf-layout.ts";
import { measureElementWidth } from "../src/util/element-width.ts";
import {
  HEATMAP_CELL_PX,
  HEATMAP_DAY_LABEL_PX,
  HEATMAP_GAP_PX,
  HEATMAP_SCROLL_PAD_PX,
  HEATMAP_WEEK_PAD_PX,
  heatmapBodyMinWidth,
  heatmapNeedsHorizontalScroll,
  heatmapTrackWidth,
  heatmapWeekColumnPx,
  heatmapWeeksWidth,
} from "../src/util/heatmap-metrics.ts";
import { hobbyItemFromFileCache } from "../src/util/hobby-item-scan.ts";
import { parseCoverRef } from "../src/views/book-shelf.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const styles = readFileSync(join(root, "styles.css"), "utf8");

const IPHONE_SE = 320;
const IPHONE_14 = 390;
const PIXEL_NARROW = 360;

test("resolveBookShelfScale reads scale or ratio and clamps", () => {
  assert.equal(resolveBookShelfScale(undefined), 1);
  assert.equal(resolveBookShelfScale({}), 1);
  assert.equal(resolveBookShelfScale({ scale: "1.5" }), 1.5);
  assert.equal(resolveBookShelfScale({ ratio: "0.5" }), 0.5);
  assert.equal(resolveBookShelfScale({ scale: "1.5", ratio: "2" }), 1.5);
  assert.equal(resolveBookShelfScale({ scale: "0" }), 1);
  assert.equal(resolveBookShelfScale({ scale: "-1" }), 1);
  assert.equal(resolveBookShelfScale({ scale: "abc" }), 1);
  assert.equal(resolveBookShelfScale({ scale: "0.1" }), 0.25);
  assert.equal(resolveBookShelfScale({ scale: "9" }), 4);
  assert.deepEqual(scaledBookSize(1), { maxWidth: 80, minWidth: 56 });
  assert.deepEqual(scaledBookSize(1.5), { maxWidth: 120, minWidth: 84 });
  assert.deepEqual(scaledBookSize(0.5), { maxWidth: 40, minWidth: 28 });
});

test("bookWidthForContainer keeps default size on wide panes", () => {
  assert.equal(bookWidthForContainer(900), DEFAULT_BOOK_WIDTH_PX);
  assert.equal(bookHeightForWidth(DEFAULT_BOOK_WIDTH_PX), DEFAULT_BOOK_HEIGHT_PX);
});

test("bookWidthForContainer shrinks so three books fit on a phone pane", () => {
  const width = bookWidthForContainer(IPHONE_SE);
  assert.ok(width <= DEFAULT_BOOK_WIDTH_PX);
  assert.ok(width >= MIN_BOOK_WIDTH_PX);
  const needed =
    ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(
    needed <= IPHONE_SE,
    `three ${width}px books need ${needed}px, pane is ${IPHONE_SE}px`,
  );
});

test("bookWidthForContainer floors at MIN_BOOK_WIDTH_PX on tiny panes", () => {
  assert.equal(bookWidthForContainer(120), MIN_BOOK_WIDTH_PX);
  assert.equal(rowNeedsHorizontalScroll(120, MIN_BOOK_WIDTH_PX), true);
});

test("bookWidthForContainer honors a scale ratio on wide panes", () => {
  const { maxWidth, minWidth } = scaledBookSize(1.5);
  assert.equal(bookWidthForContainer(900, undefined, undefined, minWidth, maxWidth), 120);
  assert.equal(bookHeightForWidth(120), 186);
});

test("booksPerRow never wraps below three books", () => {
  assert.equal(MIN_BOOKS_PER_ROW, 3);
  assert.equal(booksPerRow(0), 3);
  assert.equal(booksPerRow(100), 3);
  assert.ok(booksPerRow(IPHONE_SE) >= 3);
  assert.ok(booksPerRow(IPHONE_14) >= 3);
  assert.ok(booksPerRow(900) >= 3);
});

test("booksPerRow still adds more books when the pane is wide", () => {
  const wide = booksPerRow(720, DEFAULT_BOOK_WIDTH_PX);
  assert.ok(wide >= 4);
  assert.deepEqual(chunkItems(["a", "b", "c", "d", "e"], 3), [
    ["a", "b", "c"],
    ["d", "e"],
  ]);
});

test("measureElementWidth walks parents when the frame is 0 (iOS first paint)", () => {
  const frame = {
    clientWidth: 0,
    getBoundingClientRect: () => ({ width: 0 }),
    parentElement: {
      clientWidth: 0,
      getBoundingClientRect: () => ({ width: 0 }),
      parentElement: {
        clientWidth: PIXEL_NARROW,
        getBoundingClientRect: () => ({ width: PIXEL_NARROW }),
        parentElement: null,
      },
    },
  };
  assert.equal(measureElementWidth(frame), PIXEL_NARROW);
  assert.equal(measureElementWidth({ clientWidth: 0 }, 414), 414);
  assert.equal(measureElementWidth(null, 0), 0);
});

test("heatmap year grid is narrower than the old 16px cells", () => {
  const weeks = 53;
  const width = heatmapWeeksWidth(weeks);
  const oldWidth = weeks * 16 + (weeks - 1) * 2;
  assert.ok(width < oldWidth);
  assert.equal(HEATMAP_CELL_PX, 11);
  assert.equal(HEATMAP_GAP_PX, 1);
  assert.equal(HEATMAP_WEEK_PAD_PX, 1);
  assert.equal(heatmapWeekColumnPx(), HEATMAP_CELL_PX + 2 * HEATMAP_WEEK_PAD_PX);
  assert.equal(
    heatmapTrackWidth(weeks),
    weeks * heatmapWeekColumnPx() + (weeks - 1) * HEATMAP_GAP_PX,
  );
  assert.ok(heatmapNeedsHorizontalScroll(IPHONE_SE, weeks));
  assert.ok(
    heatmapBodyMinWidth(weeks) ===
      HEATMAP_DAY_LABEL_PX + heatmapWeeksWidth(weeks),
  );
  assert.ok(HEATMAP_SCROLL_PAD_PX >= 3);
});

test("hobbyItemFromFileCache includes files before metadata is ready", () => {
  const pending = hobbyItemFromFileCache({
    path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
    basename: "Atomic Habits",
    frontmatter: null,
    activityId: "reading",
  });
  assert.deepEqual(pending, {
    path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
    basename: "Atomic Habits",
    frontmatter: {
      type: "atomic-item",
      activity: "reading",
      title: "Atomic Habits",
    },
  });
});

test("hobbyItemFromFileCache still rejects other activities once cache exists", () => {
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Chess/Items/Game.md",
      basename: "Game",
      frontmatter: { type: "atomic-item", activity: "chess" },
      activityId: "reading",
    }),
    null,
  );
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Reading/Items/Notes.md",
      basename: "Notes",
      frontmatter: {},
      activityId: "reading",
    }),
    null,
  );
  assert.equal(
    hobbyItemFromFileCache({
      path: "atomics/hobbies/Chess/Items/Game.md",
      basename: "Game",
      frontmatter: { type: "atomic-item", activity: "chess" },
      activityId: "reading",
    }),
    null,
  );
  const ok = hobbyItemFromFileCache({
    path: "atomics/hobbies/Reading/Items/Current.md",
    basename: "Current",
    frontmatter: { type: "atomic-item", activity: "reading", status: "reading" },
    activityId: "reading",
  });
  assert.equal(ok?.frontmatter.status, "reading");
});

test("parseCoverRef rejects javascript and non-raster data URLs", () => {
  assert.deepEqual(parseCoverRef("javascript:alert(1)"), { kind: "none" });
  assert.deepEqual(parseCoverRef("JAVASCRIPT:alert(1)"), { kind: "none" });
  assert.deepEqual(parseCoverRef("data:text/html,<script>x</script>"), {
    kind: "none",
  });
  assert.deepEqual(parseCoverRef("data:image/svg+xml,<svg></svg>"), {
    kind: "none",
  });
  assert.deepEqual(
    parseCoverRef("data:image/png;base64,iVBORw0KGgo="),
    { kind: "url", src: "data:image/png;base64,iVBORw0KGgo=" },
  );
});

test("book shelf window resize listener is only a ResizeObserver fallback", () => {
  const src = readFileSync(join(root, "src/views/book-shelf.ts"), "utf8");
  const fallback = src.indexOf("const onWindowResize");
  assert.ok(fallback > 0);
  const observerCheck = src.lastIndexOf("typeof ResizeObserver", fallback);
  assert.ok(observerCheck > 0);
  assert.match(src.slice(observerCheck, fallback), /return;/);
  assert.match(
    src.slice(fallback),
    /window\.addEventListener\("resize", onWindowResize\)/,
  );
});

test("flat mobile books do not paint a spine strip over the cover", () => {
  const hoverAt = styles.indexOf("@media (hover: hover) and (pointer: fine)");
  assert.ok(hoverAt > 0);
  const flat = styles.slice(0, hoverAt);
  const hover = styles.slice(hoverAt);

  assert.match(
    flat,
    /\.fitness-plugin \.atomic-book-spine\s*\{[^}]*display:\s*none/s,
  );
  assert.match(
    hover,
    /\.fitness-plugin \.atomic-book-spine\s*\{[^}]*display:\s*block/s,
  );
  assert.match(
    hover,
    /\.fitness-plugin \.atomic-book-spine\s*\{[^}]*rotateY\(90deg\)/s,
  );
  assert.match(
    styles,
    /\.atomic-book-cover-image\s*\{[^}]*position:\s*absolute/s,
  );
});

test("cover-open animation is available without hover-fine pointers", () => {
  const hoverAt = styles.indexOf("@media (hover: hover) and (pointer: fine)");
  assert.ok(hoverAt > 0);
  const flat = styles.slice(0, hoverAt);
  assert.match(flat, /is-cover-open/);
  assert.match(flat, /rotateY\(-155deg\)/);
  assert.doesNotMatch(
    flat,
    /\.atomic-book:is\([^)]*:active/,
  );
  assert.doesNotMatch(
    flat,
    /\.atomic-book\.is-cover-open[^{]*:hover/,
  );
  const restingRow = flat.match(
    /\.fitness-plugin \.atomic-book-row-books\s*\{[^}]+\}/,
  );
  assert.ok(restingRow);
  assert.doesNotMatch(restingRow[0], /perspective/);
  assert.doesNotMatch(flat, /\.is-opening/);
  assert.match(
    flat,
    /\.atomic-book\.is-cover-open\s*\{[^}]*perspective:\s*1400px/s,
  );
});

test("cover images apply coverObjectPosition after load", () => {
  const src = readFileSync(join(root, "src/views/book-shelf.ts"), "utf8");
  assert.match(src, /bindCoverObjectPosition\(img\)/);
  assert.match(
    src,
    /function bindCoverObjectPosition[\s\S]*?addEventListener\("load", apply, \{ once: true \}/,
  );
});

/** The rule whose selector list includes `selector` exactly, or null. */
function cssRule(source, selector) {
  const withoutComments = source.replace(/\/\*[\s\S]*?\*\//g, "");
  for (const match of withoutComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = match[1].split(",").map((one) => one.trim());
    if (selectors.includes(selector)) return { selectors: match[1], body: match[2] };
  }
  return null;
}

/** Every `@media <query>` block in the sheet, concatenated. */
function cssMedia(source, query) {
  const blocks = [];
  let from = 0;
  for (;;) {
    const at = source.indexOf(`@media ${query}`, from);
    if (at === -1) break;
    const open = source.indexOf("{", at);
    let depth = 0;
    for (let i = open; i < source.length; i += 1) {
      if (source[i] === "{") depth += 1;
      if (source[i] === "}") depth -= 1;
      if (depth === 0) {
        blocks.push(source.slice(open + 1, i));
        from = i;
        break;
      }
    }
    if (from < open) break;
  }
  return blocks.length ? blocks.join("\n") : null;
}

test("cue cards fan on desktop and stack on phones", () => {
  const fan = cssRule(styles, ".fitness-plugin .atomic-cue-fan");
  assert.match(fan.body, /grid-template-columns:\s*repeat\(auto-fill, var\(--atomic-cue-step\)\)/);
  const card = cssRule(styles, ".fitness-plugin .atomic-cue-card");
  // A default button box shrink-wraps the sheet, which collapses phone cards.
  assert.match(card.body, /display:\s*block/);
  assert.match(card.body, /width:\s*var\(--atomic-cue-width\)/);

  const sheet = cssRule(styles, ".fitness-plugin .atomic-cue-sheet");
  assert.match(sheet.body, /width:\s*100%/);
  assert.match(sheet.body, /box-sizing:\s*border-box/);
  // Alternating tilt and vertical drop are what make a row read as a stack.
  assert.match(
    sheet.body,
    /transform:\s*rotate\(var\(--atomic-cue-tilt\)\) translateY\(var\(--atomic-cue-drop\)\)/,
  );

  const phone = cssMedia(styles, "(max-width: 600px)");
  assert.ok(phone, "cue cards need a phone breakpoint");
  assert.match(cssRule(phone, ".fitness-plugin .atomic-cue-fan").body, /grid-template-columns:\s*1fr/);
  assert.match(cssRule(phone, ".fitness-plugin .atomic-cue-sheet").body, /position:\s*relative/);
});

test("the cue pop works on hover, focus, and tap alike", () => {
  // Remote desktops and touch-capable laptops report no hover even with a
  // mouse attached, so the pop cannot live behind a hover media query.
  const pop = cssRule(styles, ".fitness-plugin .atomic-cue-card:hover .atomic-cue-sheet");
  assert.match(pop.selectors, /:focus-visible \.atomic-cue-sheet/);
  assert.match(pop.selectors, /\.is-open \.atomic-cue-sheet/);
  assert.match(pop.body, /translateY\(-18px\)/);

  const wash = cssRule(styles, ".fitness-plugin .atomic-cue-body::after");
  assert.match(wash.body, /linear-gradient/);
  assert.match(wash.body, /opacity:\s*var\(--atomic-cue-wash\)/);
  assert.match(wash.body, /var\(--atomic-cue-stock\)/);
  const body = cssRule(styles, ".fitness-plugin .atomic-cue-body");
  assert.match(body.body, /--atomic-cue-wash:\s*1/);
  const hideWash = cssRule(
    styles,
    ".fitness-plugin .atomic-cue-card:hover .atomic-cue-body",
  );
  assert.match(hideWash.selectors, /:focus-visible \.atomic-cue-body/);
  assert.match(hideWash.selectors, /\.is-open \.atomic-cue-body/);
  assert.match(hideWash.body, /--atomic-cue-wash:\s*0/);
  const sheet = cssRule(styles, ".fitness-plugin .atomic-cue-sheet");
  assert.match(sheet.body, /--atomic-cue-stock:/);

  const hoverOnly = cssMedia(styles, "(hover: hover) and (pointer: fine)") || "";
  assert.doesNotMatch(hoverOnly, /atomic-cue/);

  const reduced = cssMedia(styles, "(prefers-reduced-motion: reduce)");
  const calmed = cssRule(reduced, ".fitness-plugin .atomic-cue-sheet");
  assert.match(calmed.body, /transition:\s*none/);
});

test("phone cue cards pop only when tapped open", () => {
  const phone = cssMedia(styles, "(max-width: 600px)");
  assert.ok(phone, "cue cards need a phone breakpoint");
  const hoverSheet = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card:hover .atomic-cue-sheet",
  );
  assert.ok(hoverSheet, "phone CSS must reset sticky hover");
  assert.doesNotMatch(hoverSheet.selectors, /\.is-open/);
  assert.match(hoverSheet.body, /rotate\(var\(--atomic-cue-tilt\)\)/);
  const openSheet = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card.is-open .atomic-cue-sheet",
  );
  assert.match(openSheet.body, /translateY\(-6px\)/);
  assert.match(phone, /--atomic-cue-drop:\s*0px/);
  const body = cssRule(phone, ".fitness-plugin .atomic-cue-body");
  assert.match(body.body, /transition:\s*none/);
  const hoverBody = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card:hover .atomic-cue-body",
  );
  assert.match(hoverBody.body, /--atomic-cue-wash:\s*1/);
  const openBody = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card.is-open .atomic-cue-body",
  );
  assert.match(openBody.body, /--atomic-cue-wash:\s*0/);
});

test("styles hide atomic scrollbars, pin heatmap width, and theme the today ring", () => {
  assert.doesNotMatch(styles, /scrollbar-width/);
  assert.match(styles, /::-webkit-scrollbar/);
  assert.match(styles, /--scrollbar-thumb-bg:\s*transparent/);
  assert.match(styles, /--scrollbar-size:\s*0px/);
  assert.match(styles, /\.atomic-scrollport::-webkit-scrollbar/);
  assert.match(
    styles,
    /pre\.atomic-block-host[\s\S]*overflow-x:\s*hidden/,
  );
  assert.match(styles, /--atomic-heatmap-cell:\s*11px/);
  assert.match(styles, /--atomic-heatmap-week-pad:\s*1px/);
  assert.match(styles, /--atomic-heatmap-week-col:/);
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-month-row\s*\{[^}]*gap:\s*var\(--atomic-heatmap-gap\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-month-label\s*\{[^}]*width:\s*var\(--atomic-heatmap-week-col\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-month-spacer\s*\{[^}]*width:\s*var\(--atomic-heatmap-week-col\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-week\s*\{[^}]*padding:\s*var\(--atomic-heatmap-week-pad\)/s,
  );
  assert.match(styles, /--atomic-book-width:\s*80px/);
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-heatmap-body\s*\{[^}]*min-width:\s*0/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.fitness-heatmap-scroll\s*\{[^}]*overflow-x:\s*auto/s,
  );
  assert.match(styles, /\.theme-dark[^{]*\.fitness-cell\.is-today/);
  assert.match(styles, /\.fitness-cell\.is-today[^}]*#000/s);
  assert.match(styles, /\.fitness-weeks-end-pad\s*\{/);
  assert.match(
    styles,
    /\.atomic-book-row-books\s*\{[^}]*overflow-x:\s*auto/s,
  );
});
