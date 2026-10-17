import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_READER_SIZE,
  READER_DESK_TYPE,
  READER_PAGE_BOX,
  READER_PHONE_TYPE,
  READER_SIZE_EASING,
  READER_SIZE_FRONTMATTER_KEY,
  READER_SIZE_MOTION_MS,
  READER_SIZE_ORDER,
  effectiveReaderSize,
  parseReaderSize,
  readReaderSize,
  readReaderSizeFromRecord,
  readerPageGeometry,
  readerSizeShortcutDirection,
  stepReaderSize,
  readerReflowBox,
  settleReaderSize,
  writeReaderSize,
} from "../src/reader/size/index.ts";
import { readReaderNote } from "../src/reader/shell/frontmatter.ts";
import { paginateReaderBlocks } from "../src/reader/shell/paginate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = readFileSync(join(root, "tests/fixtures/reader-size-note.md"), "utf8");

test("desk page boxes match the reader mock and the journey line clip", () => {
  assert.deepEqual(READER_PAGE_BOX.s, { width: 230, height: 280, theaterHeight: 280 });
  assert.deepEqual(READER_PAGE_BOX.m, { width: 270, height: 340, theaterHeight: 340 });
  assert.deepEqual(READER_PAGE_BOX.l, { width: 305, height: 410, theaterHeight: 420 });
  assert.deepEqual(READER_PAGE_BOX.xl, { width: 340, height: 488, theaterHeight: 500 });

  const medium = readerPageGeometry("m");
  assert.equal(medium.width, 270);
  assert.equal(medium.height, 340);
  assert.equal(medium.fontSizePx, 12.5);
  assert.equal(medium.lineHeightPx, 19);
  assert.equal(medium.lines, 15);
  assert.equal(medium.clipHeight, 285);

  const extra = readerPageGeometry("xl");
  assert.equal(extra.width, 340);
  assert.equal(extra.height, 488);
  assert.equal(extra.lines, 22);
  assert.equal(extra.clipHeight, 418);

  const small = readerPageGeometry("s");
  const large = readerPageGeometry("l");
  assert.equal(small.lines, 12);
  assert.equal(large.lines, 18);
  assert.ok(small.width < medium.width && medium.width < large.width && large.width < extra.width);
  assert.ok(small.height < medium.height && medium.height < large.height && large.height < extra.height);
});

test("type stays fixed while the page grows", () => {
  for (const size of READER_SIZE_ORDER) {
    const desk = readerPageGeometry(size);
    const phone = readerPageGeometry(size, { surface: "phone" });
    assert.equal(desk.fontSizePx, READER_DESK_TYPE.fontSizePx);
    assert.equal(desk.lineHeightPx, READER_DESK_TYPE.lineHeightPx);
    assert.equal(phone.fontSizePx, READER_PHONE_TYPE.fontSizePx);
    assert.equal(phone.lineHeightPx, READER_PHONE_TYPE.lineHeightPx);
    assert.equal(phone.width, desk.width);
    assert.equal(phone.height, desk.height);
    assert.notEqual(phone.lines, desk.lines);
  }
});

test("theater locks XL at 340×500 and about 23 lines without changing the settled size", () => {
  assert.equal(effectiveReaderSize("m", true), "xl");
  assert.equal(effectiveReaderSize("s", false), "s");
  const theater = readerPageGeometry("m", { theater: true });
  assert.equal(theater.size, "xl");
  assert.equal(theater.width, 340);
  assert.equal(theater.height, 500);
  assert.equal(theater.lines, 23);
  assert.equal(theater.clipHeight, 437);
  assert.equal(theater.fontSizePx, 12.5);
  assert.equal(theater.lineHeightPx, 19);
  const settled = writeReaderSize(fixture, "m");
  assert.equal(readReaderSize(settled), "m");
  assert.match(settled, /reader\.size: m\n/);
});

test("resize motion is 200ms and instant under reduced motion in styles.css", () => {
  assert.equal(READER_SIZE_MOTION_MS, 200);
  assert.equal(READER_SIZE_EASING, "cubic-bezier(0.2, 0, 0, 1)");
  const styles = readFileSync(join(root, "styles.css"), "utf8");
  const section = styles.slice(styles.indexOf("/* Book size"));
  assert.ok(section.length > 0, "styles.css has a book size section");
  assert.match(section, /width 200ms cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(section, /height 200ms cubic-bezier\(0\.2, 0, 0, 1\)/);
  assert.match(section, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(section, /\.atomic-reader-sized\.is-instant \{[^}]*transition:\s*none/s);
  assert.doesNotMatch(section, /purple|#7c3aed|#6d28d9|#8b5cf6/i);
});

test("a new book note has no reader.size and starts at M", () => {
  assert.equal(DEFAULT_READER_SIZE, "m");
  assert.equal(readReaderSize(fixture), "m");
  assert.equal(readReaderSizeFromRecord({ type: "atomic-item", pages: 432 }), "m");
  assert.equal(parseReaderSize("huge"), "m");
  assert.equal(parseReaderSize(""), "m");
});

test("reader.size persists on the book note and leaves the rest of the note alone", () => {
  const saved = writeReaderSize(fixture, "xl");
  assert.equal(readReaderSize(saved), "xl");
  assert.match(saved, /reader\.size: xl\n/);
  assert.match(saved, /pages: 432\n/);
  assert.match(saved, /related_canvas: "\[\[Pride and Prejudice\.canvas\]\]"\n/);
  assert.match(saved, /total_min: 21\n/);
  assert.match(saved, /# Pride and Prejudice\n/);
  assert.match(saved, /The line everyone quotes\./);
  assert.match(saved, /```atomic-timer\nactivity: reading\n```/);
  assert.equal(saved.split("reader.size").length, 2);

  const again = writeReaderSize(saved, "l");
  assert.equal(readReaderSize(again), "l");
  assert.equal(again.split("reader.size").length, 2);
  assert.equal(writeReaderSize(again, "l"), again);

  const quoted = saved.replace("reader.size: xl", 'reader.size: "XL"');
  assert.equal(readReaderSize(quoted), "xl");
  assert.equal(
    readReaderSizeFromRecord({ [READER_SIZE_FRONTMATTER_KEY]: "s" }),
    "s",
  );
});

test("reader.size in the note body is not the saved size", () => {
  const withBody = `${fixture}\nreader.size: xl\n`;
  assert.equal(readReaderSize(withBody), "m");
  const saved = writeReaderSize(withBody, "s");
  assert.equal(readReaderSize(saved), "s");
  assert.match(saved, /# Pride and Prejudice[\s\S]*reader\.size: xl/);
});

test("flat reader.size updates a nested reader size the shell prefers", () => {
  const note = "---\nreader.size: s\nreader:\n  page: 3\n  size: m\nsize: 12\n---\n\nBody\n";
  assert.equal(readReaderNote(note).size, "m");
  assert.equal(readReaderNote(note).page, 3);
  const saved = writeReaderSize(note, "xl");
  assert.match(saved, /^reader\.size: xl$/m);
  assert.match(saved, /^  size: xl$/m);
  assert.match(saved, /^  page: 3$/m);
  assert.match(saved, /^size: 12$/m);
  assert.equal(readReaderNote(saved).size, "xl");
  assert.equal(readReaderNote(saved).page, 3);
  assert.equal(writeReaderSize(saved, "xl"), saved);

  const inline = "---\ntitle: Book\nreader: { page: 3, size: m }\n---\n";
  const flowed = writeReaderSize(inline, "l");
  assert.match(flowed, /reader: \{ page: 3, size: l \}/);
  assert.match(flowed, /^reader\.size: l$/m);
  assert.equal(readReaderNote(flowed).size, "l");
  assert.equal(readReaderNote(flowed).page, 3);
});

test("a size change reflows through the shell paginator", () => {
  const medium = readerReflowBox("m", false);
  const extra = readerReflowBox("xl", false);
  const theater = readerReflowBox("m", true);
  assert.equal(medium.bodyLines, 15);
  assert.equal(medium.width, 270);
  assert.equal(medium.height, 340);
  assert.equal(extra.bodyLines, 22);
  assert.equal(extra.width, 340);
  assert.equal(extra.height, 488);
  assert.equal(theater.size, "m");
  assert.equal(theater.bodyLines, 23);
  assert.equal(theater.width, 340);
  assert.equal(theater.height, 500);
  assert.equal(theater.charsPerLine, extra.charsPerLine);

  const text = Array.from({ length: 120 }, (_, index) => `word${index}`).join(" ");
  const blocks = [{ kind: "paragraph", text }];
  const mediumPages = paginateReaderBlocks(blocks, medium);
  const extraPages = paginateReaderBlocks(blocks, extra);
  const theaterPages = paginateReaderBlocks(blocks, theater);
  assert.ok(mediumPages.length > 1);
  assert.ok(extraPages.length < mediumPages.length);
  assert.ok(theaterPages.length <= extraPages.length);
  assert.equal(
    paginateReaderBlocks(blocks, readerReflowBox("m", false)).length,
    mediumPages.length,
  );
});

test("a chosen size survives shell repaints until the note is read again", () => {
  const opened = settleReaderSize(undefined, "m");
  assert.deepEqual(opened, { settled: "m", shell: "m" });
  const chosen = { settled: "xl", shell: "m" };
  assert.deepEqual(settleReaderSize(chosen, "m"), chosen);
  assert.deepEqual(settleReaderSize(chosen, "s"), { settled: "s", shell: "s" });
});

test("a note without frontmatter gains a reader.size fence", () => {
  const markdown = "# Loose page\n\nNo fence yet.\n";
  const saved = writeReaderSize(markdown, "l");
  assert.equal(readReaderSize(saved), "l");
  assert.match(saved, /^---\nreader\.size: l\n---\n\n# Loose page/);
});

test("size steps clamp at S and XL", () => {
  assert.equal(stepReaderSize("m", -1), "s");
  assert.equal(stepReaderSize("s", -1), "s");
  assert.equal(stepReaderSize("l", 1), "xl");
  assert.equal(stepReaderSize("xl", 1), "xl");
});

test("⌘− / ⌘+ and Ctrl− / Ctrl+ step the size", () => {
  assert.equal(readerSizeShortcutDirection({ key: "-", metaKey: true, ctrlKey: false, altKey: false }), -1);
  assert.equal(readerSizeShortcutDirection({ key: "+", metaKey: true, ctrlKey: false, altKey: false }), 1);
  assert.equal(readerSizeShortcutDirection({ key: "=", ctrlKey: true, metaKey: false, altKey: false }), 1);
  assert.equal(readerSizeShortcutDirection({ key: "-", metaKey: false, ctrlKey: false, altKey: false }), null);
  assert.equal(readerSizeShortcutDirection({ key: "-", metaKey: true, ctrlKey: false, altKey: true }), null);
  assert.equal(readerSizeShortcutDirection({ key: "0", metaKey: true, ctrlKey: false, altKey: false }), null);
});
