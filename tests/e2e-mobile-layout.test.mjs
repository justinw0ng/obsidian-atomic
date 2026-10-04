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
  HEATMAP_LABEL_GAP_PX,
  HEATMAP_PITCH_PX,
  heatmapBodyMinWidth,
  heatmapNeedsHorizontalScroll,
  heatmapTrackWidth,
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
  assert.deepEqual(scaledBookSize(1), { maxWidth: 96, minWidth: 56 });
  assert.deepEqual(scaledBookSize(1.5), { maxWidth: 144, minWidth: 84 });
  assert.deepEqual(scaledBookSize(0.5), { maxWidth: 48, minWidth: 28 });
});

test("bookWidthForContainer grows three books to fill a wide pane", () => {
  const width = bookWidthForContainer(900);
  assert.ok(width > DEFAULT_BOOK_WIDTH_PX);
  const needed = ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(needed <= 900);
  assert.ok(900 - needed < 3, `leftover beside three books is ${900 - needed}px`);
  assert.equal(
    bookHeightForWidth(width),
    Math.round((width * DEFAULT_BOOK_HEIGHT_PX) / DEFAULT_BOOK_WIDTH_PX),
  );
});

test("bookWidthForContainer shrinks so three books fit on a phone pane", () => {
  const width = bookWidthForContainer(IPHONE_SE);
  const needed = ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(
    needed <= IPHONE_SE,
    `three ${width}px books need ${needed}px, pane is ${IPHONE_SE}px`,
  );
  assert.equal(rowNeedsHorizontalScroll(IPHONE_SE, width), false);
  assert.equal(bookHeightForWidth(DEFAULT_BOOK_WIDTH_PX), DEFAULT_BOOK_HEIGHT_PX);
});

test("bookWidthForContainer keeps three books on a tiny pane", () => {
  const width = bookWidthForContainer(120);
  assert.ok(width < MIN_BOOK_WIDTH_PX);
  const needed = ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(needed <= 120, `three ${width}px books need ${needed}px`);
  assert.equal(rowNeedsHorizontalScroll(120, width), false);
});

test("bookWidthForContainer fills a wide row past the scaled preferred size", () => {
  const { maxWidth, minWidth } = scaledBookSize(1.5);
  assert.equal(bookWidthForContainer(0, undefined, undefined, minWidth, maxWidth), 144);
  const width = bookWidthForContainer(900, undefined, undefined, minWidth, maxWidth);
  assert.ok(width > maxWidth);
  const needed = ROW_PADDING_PX + 3 * width + 2 * BOOK_GAP_PX;
  assert.ok(900 - needed < 3);
  assert.equal(bookHeightForWidth(144), 225);
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

test("heatmap year grid uses 10px cells and a 3px gap", () => {
  const weeks = 53;
  const width = heatmapTrackWidth(weeks);
  const oldWidth = weeks * 16 + (weeks - 1) * 2;
  assert.ok(width < oldWidth);
  assert.equal(HEATMAP_CELL_PX, 10);
  assert.equal(HEATMAP_GAP_PX, 3);
  assert.equal(HEATMAP_PITCH_PX, 13);
  assert.equal(HEATMAP_DAY_LABEL_PX, 16);
  assert.equal(HEATMAP_LABEL_GAP_PX, 6);
  assert.equal(width, weeks * 10 + (weeks - 1) * 3);
  assert.equal(
    heatmapBodyMinWidth(weeks),
    HEATMAP_DAY_LABEL_PX + HEATMAP_LABEL_GAP_PX + width,
  );
  assert.ok(heatmapNeedsHorizontalScroll(IPHONE_SE, weeks));
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

test("flat books paint a cover crease and hang a reading ribbon", () => {
  assert.match(styles, /\.atomic-book-ribbon::before/);
  assert.match(styles, /border-width:\s*0 4px 6px/);
  assert.doesNotMatch(styles, /clip-path\s*:/);
  assert.doesNotMatch(styles, /rotateY\(-155deg\)/);
  assert.match(
    styles,
    /@media \(hover: none\) and \(pointer: coarse\)\s*\{[^}]*\.atomic-book\.is-cover-open\s*\{[^}]*translateY\(-10px\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover\s*\{[^}]*position:\s*absolute/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover\s*\{[^}]*inset:\s*0/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover\s*\{[^}]*object-fit:\s*cover/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book\s*\{[^}]*flex:\s*0 0 var\(--atomic-book-w\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover-title\s*\{[^}]*overflow-wrap:\s*anywhere/s,
  );
  assert.match(styles, /\.atomic-book-cover-title\.is-title-sm/);
  assert.match(styles, /\.atomic-book-cover-title\.is-title-xs/);
});

test("fine pointers pop a book, then open the cover on click", () => {
  const hoverAt = styles.indexOf("@media (hover: hover) and (pointer: fine), (pointer: none)");
  assert.ok(hoverAt > 0);
  const hover = styles.slice(hoverAt, styles.indexOf("}", styles.indexOf("is-cover-open::after", hoverAt)));
  assert.match(hover, /perspective\(700px\)/);
  assert.match(hover, /rotateY\(calc\(var\(--px\)/);
  assert.match(hover, /\.atomic-book\.is-cover-open \.atomic-book-face/);
  assert.match(hover, /rotateY\(-112deg\)/);
  assert.doesNotMatch(styles, /\.atomic-book\.is-lifted/);
  assert.match(styles, /min-width:\s*100%/);
  assert.match(styles, /min-height:\s*100%/);
  assert.doesNotMatch(styles, /rotateY\(-155deg\)/);
  assert.doesNotMatch(styles, /atomic-book-spine/);
});

test("cover images fill the book face from the center", () => {
  const src = readFileSync(join(root, "src/views/book-shelf.ts"), "utf8");
  assert.doesNotMatch(src, /coverObjectPosition/);
  assert.doesNotMatch(src, /--atomic-cover-position/);
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover\s*\{[^}]*object-fit:\s*cover/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-book-cover\s*\{[^}]*object-position:\s*center/s,
  );
  const filled = cssRule(
    styles,
    ".workspace-leaf-content .fitness-plugin img.atomic-book-cover",
  );
  assert.ok(filled, "editor images need a more specific cover rule");
  assert.match(filled.body, /object-fit:\s*cover/);
  assert.match(filled.body, /max-width:\s*none/);
  assert.match(filled.body, /height:\s*100%/);
  assert.match(filled.body, /image-rendering:\s*auto/);
  assert.doesNotMatch(filled.selectors, /markdown-preview-view/);
  const reading = cssRule(
    styles,
    ".markdown-preview-view .fitness-plugin button.atomic-book img.atomic-book-cover",
  );
  assert.ok(reading, "reading mode needs its own cover rule");
  assert.match(reading.body, /top:\s*0/);
  assert.match(reading.body, /bottom:\s*0/);
  assert.match(reading.body, /object-fit:\s*cover/);
  assert.match(reading.body, /max-width:\s*none/);
  assert.doesNotMatch(reading.body, /invert\(/);
  const readingButton = cssRule(
    styles,
    ".markdown-preview-view .fitness-plugin button.atomic-book",
  );
  assert.match(readingButton.body, /display:\s*block/);
  assert.match(readingButton.body, /padding:\s*0/);
  assert.doesNotMatch(styles, /scroll-snap-type/);
  assert.doesNotMatch(styles, /--atomic-book-w:\s*84px/);
});

test("an open cover keeps its colors and the reading ribbon hangs out at rest", () => {
  const face = cssRule(
    styles,
    ".fitness-plugin .atomic-book.is-cover-open .atomic-book-face",
  );
  assert.match(face.body, /filter:\s*blur\(6px\)/);
  assert.doesNotMatch(face.body, /invert\(/);
  assert.doesNotMatch(styles, /filter:\s*invert\(/);
  assert.doesNotMatch(face.body, /#fff/);
  assert.doesNotMatch(face.body, /#000/);
  const cover = cssRule(
    styles,
    ".fitness-plugin .atomic-book.is-cover-open .atomic-book-cover",
  );
  assert.match(cover.body, /opacity:\s*1/);
  assert.doesNotMatch(styles, /is-cover-open:not\(\.has-cover\)/);
  const ribbon = cssRule(styles, ".fitness-plugin .atomic-book-ribbon");
  assert.match(ribbon.body, /z-index:\s*3/);
  assert.match(ribbon.body, /top:\s*calc\(100% - 4px\)/);
  assert.doesNotMatch(ribbon.body, /z-index:\s*-1/);
  const scroll = cssRule(styles, ".fitness-plugin .atomic-shelf-scroll");
  assert.match(scroll.body, /padding:\s*22px 0 20px/);
});

test("heatmap grid blocks stay apart and day labels share the cell rows", () => {
  const grid = cssRule(styles, ".fitness-plugin .fitness-heatmap-grid");
  assert.match(grid.body, /gap:\s*40px/);
  const days = cssRule(styles, ".fitness-plugin .atomic-heat-days");
  assert.match(days.body, /margin-top:\s*24px/);
  assert.match(days.body, /repeat\(7,\s*var\(--atomic-heat-cell\)\)/);
  const src = readFileSync(join(root, "src/views/heatmap.ts"), "utf8");
  assert.match(src, /heatmapWeekdayLabels\(language\)/);
  assert.doesNotMatch(src, /\["", "M", "", "W", "", "F", ""\]/);
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
  assert.match(pop.selectors, /\.is-preview \.atomic-cue-sheet/);
  assert.doesNotMatch(pop.selectors, /\.is-open/);
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
  assert.match(hideWash.selectors, /\.is-preview \.atomic-cue-body/);
  assert.doesNotMatch(hideWash.selectors, /\.is-open/);
  assert.match(hideWash.body, /--atomic-cue-wash:\s*0/);
  const sheet = cssRule(styles, ".fitness-plugin .atomic-cue-sheet");
  assert.match(sheet.body, /--atomic-cue-stock:/);

  const hoverOnly = cssMedia(styles, "(hover: hover) and (pointer: fine)") || "";
  assert.doesNotMatch(hoverOnly, /atomic-cue/);

  const reduced = cssMedia(styles, "(prefers-reduced-motion: reduce)");
  const calmed = cssRule(reduced, ".fitness-plugin .atomic-cue-sheet");
  assert.match(calmed.body, /transition:\s*none/);
});

test("the cue lightbox is a centered larger card without overlay scrollbars", () => {
  const lightbox = cssRule(styles, ".fitness-plugin.atomic-cue-lightbox");
  assert.match(lightbox.body, /position:\s*fixed/);
  assert.match(lightbox.body, /overflow:\s*hidden/);
  assert.match(lightbox.body, /background:\s*transparent/);
  assert.doesNotMatch(lightbox.body, /overflow:\s*auto/);
  assert.doesNotMatch(lightbox.body, /mask/);
  assert.doesNotMatch(lightbox.body, /--atomic-cue-width:\s*420px/);
  assert.doesNotMatch(lightbox.body, /--atomic-cue-line:\s*28px/);

  const backdrop = cssRule(styles, ".fitness-plugin .atomic-cue-lightbox-backdrop");
  assert.match(backdrop.body, /background:\s*transparent/);
  assert.doesNotMatch(backdrop.body, /rgba/);

  const blurred = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox.is-placed .atomic-cue-lightbox-backdrop",
  );
  assert.match(blurred.body, /backdrop-filter:\s*blur\(var\(--atomic-cue-backdrop-blur\)\)/);
  assert.match(blurred.body, /-webkit-backdrop-filter:\s*blur\(var\(--atomic-cue-backdrop-blur\)\)/);
  assert.doesNotMatch(blurred.body, /rgba/);
  assert.doesNotMatch(blurred.body, /mask/);
  assert.match(styles, /@supports not \(\(backdrop-filter: blur\(1px\)\)/);
  const fallback = styles.slice(styles.indexOf("@supports not ((backdrop-filter"));
  assert.match(fallback, /background:\s*transparent/);
  assert.doesNotMatch(fallback.slice(0, 400), /rgba/);

  const placed = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox.is-placed > .atomic-cue-card.atomic-cue-lightbox-card",
  );
  assert.match(placed.body, /left:\s*50%/);
  assert.match(placed.body, /top:\s*50%/);
  assert.match(placed.body, /translate\(-50%, -50%\) scale\(var\(--atomic-cue-fly-scale\)\)/);
  assert.doesNotMatch(placed.body, /min\(var\(--atomic-cue-width\)/);

  const sheet = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox .atomic-cue-lightbox-card .atomic-cue-sheet",
  );
  assert.match(sheet.body, /position:\s*relative/);
  assert.match(sheet.body, /rotate\(0deg\)/);
  assert.doesNotMatch(sheet.body, /padding:\s*32px/);
  assert.doesNotMatch(sheet.body, /min-height:\s*220px/);
  const flyBody = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox .atomic-cue-lightbox-card .atomic-cue-sheet .atomic-cue-body",
  );
  assert.match(flyBody.body, /max-height:\s*calc\(/);
  assert.match(flyBody.body, /overflow-y:\s*auto/);
  assert.match(flyBody.body, /overflow-x:\s*hidden/);
  assert.doesNotMatch(flyBody.body, /overflow:\s*hidden/);
  assert.doesNotMatch(styles, /\.atomic-cue-lightbox[^{]*\.atomic-cue-text[^{]*\{[^}]*1\.7rem/s);
  assert.match(placed.body, /--atomic-cue-lightbox-width/);
  assert.match(
    styles,
    /\.atomic-cue-lightbox-card \{[^}]*max-height:\s*calc\(\(100vh/,
  );
  assert.equal(
    cssRule(
      styles,
      ".fitness-plugin.atomic-cue-lightbox .atomic-cue-lightbox-card:hover .atomic-cue-sheet",
    ),
    null,
    "lightbox sheet hover twins are unused cascade",
  );
  assert.equal(
    cssRule(
      styles,
      ".fitness-plugin.atomic-cue-lightbox .atomic-cue-lightbox-card:hover .atomic-cue-body",
    ),
    null,
    "lightbox body hover twins are unused cascade",
  );
  const measure = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox .atomic-cue-sheet.atomic-cue-lightbox-measure",
  );
  assert.match(measure.body, /width:\s*max-content/);
  assert.match(measure.body, /visibility:\s*hidden/);
  const measureText = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox .atomic-cue-lightbox-measure .atomic-cue-text",
  );
  assert.match(measureText.body, /word-break:\s*keep-all/);
  assert.match(measureText.body, /white-space:\s*nowrap/);
  assert.match(measureText.body, /overflow-wrap:\s*normal/);
});

test("phone cue cards do not expand in-flow; tap uses the lightbox", () => {
  const phone = cssMedia(styles, "(max-width: 600px)");
  assert.ok(phone, "cue cards need a phone breakpoint");
  const hoverSheet = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card:hover .atomic-cue-sheet",
  );
  assert.ok(hoverSheet, "phone CSS must reset sticky hover");
  assert.doesNotMatch(hoverSheet.selectors, /\.is-open/);
  assert.match(hoverSheet.body, /rotate\(var\(--atomic-cue-tilt\)\)/);
  assert.equal(
    cssRule(phone, ".fitness-plugin .atomic-cue-card.is-open .atomic-cue-sheet"),
    null,
    "phone tap must not keep an in-fan is-open expand",
  );
  assert.match(phone, /--atomic-cue-drop:\s*0px/);
  const body = cssRule(phone, ".fitness-plugin .atomic-cue-body");
  assert.match(body.body, /transition:\s*none/);
  assert.match(body.body, /min-height:\s*calc\(4 \* var\(--atomic-cue-line\)\)/);
  assert.match(body.body, /max-height:\s*calc\(4 \* var\(--atomic-cue-line\)\)/);
  const hoverBody = cssRule(
    phone,
    ".fitness-plugin .atomic-cue-card:hover .atomic-cue-body",
  );
  assert.match(hoverBody.body, /--atomic-cue-wash:\s*1/);
  assert.match(hoverBody.body, /max-height:\s*calc\(4 \* var\(--atomic-cue-line\)\)/);
  assert.doesNotMatch(styles, /calc\(2 \* var\(--atomic-cue-line\)\)/);
  const cueList = styles.slice(styles.lastIndexOf("@container (max-width: 600px)"));
  assert.match(cueList, /min-height:\s*calc\(4 \* var\(--atomic-cue-line\)\)/);
  const cueText = cssRule(
    styles,
    ".fitness-plugin .atomic-cue-text p",
  );
  assert.match(cueText.body, /margin:\s*0/);
  const flyCard = cssRule(
    styles,
    ".fitness-plugin.atomic-cue-lightbox > .atomic-cue-card.atomic-cue-lightbox-card",
  );
  assert.match(flyCard.body, /width:\s*var\(--atomic-cue-width\)/);
  assert.match(flyCard.body, /height:\s*auto/);
});

test("reminder and gym controls share a well and wrap with the note", () => {
  assert.match(styles, /\.fitness-plugin \.atomic-cue-log-compose/);
  assert.match(styles, /\.atomic-well/);
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-cue-log-fields\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\) auto/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin textarea\.atomic-cue-log-text\s*\{[^}]*white-space:\s*pre-wrap/s,
  );
  assert.match(styles, /\.fitness-plugin\.atomic-gym-log\s*\{[^}]*width:\s*100%/s);
  assert.match(styles, /\.fitness-plugin\.atomic-timer\s*\{[^}]*max-width:\s*560px/s);
  assert.match(styles, /container-name:\s*atomic-note/);
  assert.match(
    styles,
    /@container atomic-note \(min-width:\s*1280px\)\s*\{[^}]*atomic-embed-slot-timer/s,
  );
  assert.match(
    styles,
    /atomic-note-paired \.fitness-plugin\.atomic-cue-log \.atomic-cue-log-compose\s*\{[^}]*width:\s*calc\(50% - var\(--atomic-pair-gap\)\)/s,
  );
  assert.match(
    styles,
    /atomic-note-paired \.fitness-plugin\.atomic-timer,\s*\n\s*\.atomic-note-paired \.fitness-plugin\.atomic-gym-log\s*\{[^}]*max-width:\s*none/s,
  );
  assert.match(
    styles,
    /atomic-note-paired \.fitness-plugin\.atomic-timer,\s*\n\s*\.atomic-note-paired \.fitness-plugin\.atomic-gym-log\s*\{[^}]*height:\s*var\(--atomic-session-card-height\)/s,
  );
  assert.match(
    styles,
    /\.atomic-gym-log-fields > \.atomic-field:first-child select\.atomic-field-value\s*\{[^}]*text-overflow:\s*clip/s,
  );
  assert.match(
    styles,
    /\.atomic-gym-log-fields > \.atomic-field:first-child select\.atomic-field-value\s*\{[^}]*white-space:\s*nowrap/s,
  );
  assert.match(
    styles,
    /@container atomic-note \(max-width:\s*1279px\)\s*\{[^}]*atomic-embed-slot-timer/s,
  );
  assert.match(
    styles,
    /@container atomic-note \(max-width:\s*1279px\)[\s\S]*\.fitness-plugin\.atomic-timer,\s*\n\s*\.atomic-note-paired \.fitness-plugin\.atomic-gym-log[\s\S]*?max-width:\s*none/,
  );
  assert.match(
    styles,
    /@container atomic-timer-host \(max-width:\s*420px\)\s*\{[^}]*grid-template-areas:\s*"head"\s*"clock"\s*"actions"/s,
  );
  assert.match(
    styles,
    /@container \(max-width:\s*560px\)\s*\{[^}]*\.atomic-cue-log-fields/s,
  );
});

test("session property selects read as the value", () => {
  const select = cssRule(styles, ".metadata-property-value > .atomic-property-select");
  assert.ok(select, "note property select has its own rule");
  assert.match(select.body, /background-color:\s*transparent/);
  assert.match(select.body, /border:\s*0/);
  assert.match(select.body, /min-width:\s*0/);
  const hidden = cssRule(
    styles,
    ".metadata-properties .metadata-property-value > .metadata-input-longtext.atomic-property-native-hidden:not(:empty)",
  );
  assert.match(hidden.body, /display:\s*none/);
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
  assert.match(styles, /--atomic-heat-cell:\s*10px/);
  assert.match(styles, /--atomic-heat-gap:\s*3px/);
  assert.match(styles, /--atomic-heat-weeks/);
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-months\s*\{[^}]*repeat\(var\(--atomic-heat-weeks,\s*53\)/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-cells\s*\{[^}]*grid-auto-flow:\s*column/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-body\s*\{[^}]*grid-template-columns:\s*var\(--atomic-heat-label\)/s,
  );
  assert.match(styles, /--atomic-book-width:\s*96px/);
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-scroll\s*\{[^}]*overflow-x:\s*auto/s,
  );
  assert.match(styles, /\.theme-dark[^{]*\.atomic-heat-cell\.is-today/);
  assert.match(styles, /\.atomic-heat-cell\.is-today[^}]*box-shadow/s);
  assert.match(styles, /container-name:\s*atomic-heat/);
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-foot \.atomic-caption\s*\{[^}]*white-space:\s*nowrap/s,
  );
  assert.match(
    styles,
    /@container atomic-heat \(max-width:\s*520px\)\s*\{[^}]*font-size:\s*10px/s,
  );
  assert.match(
    styles,
    /@container atomic-heat \(max-width:\s*400px\)\s*\{[^}]*font-size:\s*9px/s,
  );
  assert.match(
    styles,
    /@container atomic-heat \(max-width:\s*320px\)\s*\{[^}]*font-size:\s*8px/s,
  );
  assert.match(
    styles,
    /\.fitness-plugin \.atomic-heat-grid\s*\{[^}]*padding:\s*4px 4px 4px 0/s,
  );
  assert.doesNotMatch(styles, /\.fitness-weeks-end-pad\s*\{/);
  assert.match(
    styles,
    /\.atomic-book-row-books\s*\{[^}]*overflow-x:\s*auto/s,
  );
});
