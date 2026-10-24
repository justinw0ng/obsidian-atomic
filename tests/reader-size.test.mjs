import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_READER_SIZE,
  READER_DESK_TYPE,
  READER_PHONE_TYPE,
  READER_SIZE_EASING,
  READER_SIZE_FRONTMATTER_KEY,
  READER_SIZE_MOTION_MS,
  READER_SIZE_ORDER,
  THEATER_XL_HEIGHT,
  effectiveReaderSize,
  parseReaderSize,
  readerPageGeometry,
  readerSizeShortcutDirection,
  stepReaderSize,
  readerReflowBox,
  settleReaderSize,
} from "../src/reader/size/index.ts";
import { readerFieldsFromFrontmatter, readReaderNote, writeReaderSize } from "../src/reader/shell/frontmatter.ts";
import { readerPageBox } from "../src/reader/shell/model.ts";
import { paginateReaderBlocks } from "../src/reader/shell/paginate.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const fixture = readFileSync(join(root, "tests/fixtures/reader-size-note.md"), "utf8");

test("desk page boxes match the reader mock and the journey line clip", () => {
  assert.equal(THEATER_XL_HEIGHT, 500);
  assert.deepEqual(readerPageBox("m"), { w: 270, h: 340, bodyLines: 15, charsPerLine: 45 });
  assert.equal(readerPageBox("xl").bodyLines, 22);
  assert.equal(readerPageBox("xl", THEATER_XL_HEIGHT).h, 500);
  assert.equal(readerPageBox("xl", THEATER_XL_HEIGHT).bodyLines, 23);

  const medium = readerPageGeometry("m");
  const mediumBox = readerPageBox("m");
  assert.equal(medium.width, mediumBox.w);
  assert.equal(medium.height, mediumBox.h);
  assert.equal(medium.lines, mediumBox.bodyLines);
  assert.equal(medium.fontSizePx, 12.5);
  assert.equal(medium.lineHeightPx, 19);
  assert.equal(medium.lines, 15);
  assert.equal(medium.clipHeight, 285);

  const extra = readerPageGeometry("xl");
  const extraBox = readerPageBox("xl");
  assert.equal(extra.width, extraBox.w);
  assert.equal(extra.height, extraBox.h);
  assert.equal(extra.lines, extraBox.bodyLines);
  assert.equal(extra.lines, 22);
  assert.equal(extra.clipHeight, 418);

  const small = readerPageGeometry("s");
  const large = readerPageGeometry("l");
  assert.equal(small.lines, readerPageBox("s").bodyLines);
  assert.equal(large.lines, readerPageBox("l").bodyLines);
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
    assert.equal(phone.lines, desk.lines);
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
  assert.equal(readReaderNote(settled).size, "m");
  assert.match(settled, /reader\.size: m\n/);
});

test("fixed XL does not animate page width or height", () => {
  assert.equal(READER_SIZE_MOTION_MS, 200);
  assert.equal(READER_SIZE_EASING, "cubic-bezier(0.2, 0, 0, 1)");
  const styles = readFileSync(join(root, "styles.css"), "utf8");
  const section = styles.slice(styles.indexOf("/* Book size"));
  assert.ok(section.length > 0, "styles.css has a book size section");
  assert.doesNotMatch(section, /width 200ms/);
  assert.doesNotMatch(section, /height 200ms/);
  assert.match(section, /\.atomic-reader-page \{[^}]*transition:\s*none/s);
  assert.match(section, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(section, /\.atomic-reader-sized\.is-instant \{[^}]*transition:\s*none/s);
  assert.doesNotMatch(section, /purple|#7c3aed|#6d28d9|#8b5cf6/i);
});

test("a new book note has no reader.size and starts at M", () => {
  assert.equal(DEFAULT_READER_SIZE, "m");
  assert.equal(readReaderNote(fixture).size, "m");
  assert.equal(readerFieldsFromFrontmatter({ type: "atomic-item", pages: 432 }).size, "m");
  assert.equal(parseReaderSize("huge"), "m");
  assert.equal(parseReaderSize(""), "m");
});

test("reader.size persists on the book note and leaves the rest of the note alone", () => {
  const saved = writeReaderSize(fixture, "xl");
  assert.equal(readReaderNote(saved).size, "xl");
  assert.match(saved, /reader\.size: xl\n/);
  assert.match(saved, /pages: 432\n/);
  assert.match(saved, /related_canvas: "\[\[Pride and Prejudice\.canvas\]\]"\n/);
  assert.match(saved, /total_min: 21\n/);
  assert.match(saved, /# Pride and Prejudice\n/);
  assert.match(saved, /The line everyone quotes\./);
  assert.match(saved, /```atomic-timer\nactivity: reading\n```/);
  assert.equal(saved.split("reader.size").length, 2);

  const again = writeReaderSize(saved, "l");
  assert.equal(readReaderNote(again).size, "l");
  assert.equal(again.split("reader.size").length, 2);
  assert.equal(writeReaderSize(again, "l"), again);

  const quoted = saved.replace("reader.size: xl", 'reader.size: "XL"');
  assert.equal(readReaderNote(quoted).size, "xl");
  assert.equal(
    readerFieldsFromFrontmatter({ [READER_SIZE_FRONTMATTER_KEY]: "s" }).size,
    "s",
  );
});

test("reader.size in the note body is not the saved size", () => {
  const withBody = `${fixture}\nreader.size: xl\n`;
  assert.equal(readReaderNote(withBody).size, "m");
  const saved = writeReaderSize(withBody, "s");
  assert.equal(readReaderNote(saved).size, "s");
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
  assert.equal(readReaderNote(saved).size, "l");
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
