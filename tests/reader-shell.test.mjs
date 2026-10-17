import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { e2eReadingEpubBytes } from "../e2e/lib/vault.mjs";
import { readEpub, htmlToReaderBlocks } from "../src/reader/shell/epub.ts";
import {
  readReaderNote,
  readerFieldsFromFrontmatter,
  updateReaderPage,
} from "../src/reader/shell/frontmatter.ts";
import {
  chooserShowsOpenBook,
  resolveLinkedBookFile,
  sourcePathFromFrontmatter,
} from "../src/reader/shell/link.ts";
import {
  isPhoneReaderLayout,
  pageAfterTurn,
  readerOpenPlan,
  readerPageBox,
  readerProgress,
  spreadPages,
} from "../src/reader/shell/model.ts";
import { resetReaderMounts, registerReaderFlight } from "../src/reader/shell/mount.ts";
import { paginateReaderBlocks } from "../src/reader/shell/paginate.ts";
import { inspectPdf, pdfViewerSrc } from "../src/reader/shell/pdf.ts";
import { openZip, zipDeflated, zipStored } from "../src/reader/shell/zip.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const styles = readFileSync(join(root, "styles.css"), "utf8");
const encoder = new TextEncoder();

const FILES = [
  { path: "atomics/hobbies/Reading/Items/Harbor Notes.epub", basename: "Harbor Notes", extension: "epub" },
  { path: "atomics/hobbies/Reading/Items/Harbor Notes.pdf", basename: "Harbor Notes", extension: "pdf" },
  { path: "archive/Leaves of Grass.pdf", basename: "Leaves of Grass", extension: "pdf" },
  { path: "atomics/hobbies/Reading/Items/Printed Leaflet.pdf", basename: "Printed Leaflet", extension: "pdf" },
];

test("resolveLinkedBookFile prefers an explicit epub or pdf source", () => {
  const linked = resolveLinkedBookFile({
    title: "Harbor Notes",
    notePath: "atomics/hobbies/Reading/Items/Harbor Notes.md",
    source: "[[Printed Leaflet.pdf]]",
    files: FILES,
  });
  assert.deepEqual(linked, {
    kind: "pdf",
    path: "atomics/hobbies/Reading/Items/Printed Leaflet.pdf",
  });
  assert.equal(sourcePathFromFrontmatter("![[Printed Leaflet.pdf|Leaflet]]"), "Printed Leaflet.pdf");
});

test("resolveLinkedBookFile matches the book title and hides Open Book when nothing matches", () => {
  const epub = resolveLinkedBookFile({
    title: "Harbor Notes",
    notePath: "atomics/hobbies/Reading/Items/Harbor Notes.md",
    source: "",
    files: FILES,
  });
  assert.equal(epub?.kind, "epub");
  assert.equal(epub?.path, "atomics/hobbies/Reading/Items/Harbor Notes.epub");
  assert.equal(chooserShowsOpenBook(epub), true);

  const missing = resolveLinkedBookFile({
    title: "Leaves of Grass",
    notePath: "atomics/hobbies/Reading/Items/Leaves of Grass.md",
    source: "",
    files: FILES.filter((file) => file.basename !== "Leaves of Grass"),
  });
  assert.equal(missing, null);
  assert.equal(chooserShowsOpenBook(missing), false);
});

test("reader progress, spread turns, and phone width follow the settled layout", () => {
  assert.deepEqual(readerProgress(47, 432), { page: 47, total: 432, percent: 11 });
  assert.deepEqual(spreadPages(1, 10), { verso: null, recto: 1 });
  assert.deepEqual(spreadPages(47, 432), { verso: 46, recto: 47 });
  assert.equal(pageAfterTurn(1, 10, 1), 3);
  assert.equal(pageAfterTurn(47, 432, -1), 45);
  assert.equal(pageAfterTurn(47, 432, 1), 49);
  assert.equal(pageAfterTurn(1, 2, 1), 2);
  assert.equal(isPhoneReaderLayout(390), true);
  assert.equal(isPhoneReaderLayout(1020), false);
  assert.equal(isPhoneReaderLayout(0), false);
  const medium = readerPageBox("m");
  assert.deepEqual({ w: medium.w, h: medium.h }, { w: 270, h: 340 });
  assert.equal(readerPageBox("xl").w, 340);
  assert.equal(readerPageBox("xl").h, 488);
  assert.equal(readerOpenPlan({ reducedMotion: true, hasFlight: true }), "direct");
  assert.equal(readerOpenPlan({ reducedMotion: false, hasFlight: false }), "direct");
  assert.equal(readerOpenPlan({ reducedMotion: false, hasFlight: true }), "flight");
});

test("reader frontmatter keeps size and writes the last-read page", () => {
  const note = `---
type: atomic-item
source: "atomics/hobbies/Reading/Items/Harbor Notes.epub"
pages: 12
related_canvas: "[[Harbor.canvas]]"
reader:
  size: xl
---

# Harbor Notes
`;
  assert.deepEqual(readReaderNote(note), {
    source: "atomics/hobbies/Reading/Items/Harbor Notes.epub",
    page: 1,
    size: "xl",
    pagesHint: 12,
    canvas: "[[Harbor.canvas]]",
  });
  const updated = updateReaderPage(note, 4);
  assert.match(updated, /size: xl/);
  assert.match(updated, /page: 4/);
  assert.equal(readReaderNote(updated).page, 4);
  assert.equal(readReaderNote(updated).size, "xl");
  assert.equal(
    readerFieldsFromFrontmatter({
      source: "Book.pdf",
      reader: { page: 8, size: "s" },
      related_canvas: "Book.canvas",
    }).page,
    8,
  );
});

test("zip and epub text round-trip without an external reader", async () => {
  const chapter = encoder.encode(
    `<?xml version="1.0"?><html xmlns="http://www.w3.org/1999/xhtml"><body><h1>Chapter I</h1><p>Harbor light kept the first page.</p><p>The channel marker follows.</p></body></html>`,
  );
  const opf = encoder.encode(`<?xml version="1.0"?>
<package>
  <manifest>
    <item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/></spine>
</package>`);
  const container = encoder.encode(
    `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
  );
  const files = [
    { name: "mimetype", data: encoder.encode("application/epub+zip") },
    { name: "META-INF/container.xml", data: container },
    { name: "OEBPS/content.opf", data: opf },
    { name: "OEBPS/chapter.xhtml", data: chapter },
  ];
  const stored = await openZip(zipStored(files));
  const chapterEntry = stored.entries.find((entry) => entry.name.endsWith("chapter.xhtml"));
  assert.match(new TextDecoder().decode(await chapterEntry.read()), /Harbor light/);

  const deflated = await openZip(await zipDeflated(files.map((file) => ({ ...file, method: 8 }))));
  const inflated = deflated.entries.find((entry) => entry.name.endsWith("chapter.xhtml"));
  assert.match(new TextDecoder().decode(await inflated.read()), /channel marker/);

  const book = await readEpub(zipStored(files));
  assert.equal(book.blocks[0].kind, "heading");
  assert.match(book.blocks[1].text, /Harbor light/);
  const pages = paginateReaderBlocks(book.blocks, { bodyLines: 4, charsPerLine: 40 });
  assert.equal(pages[0].chapter, "Chapter I");
  assert.equal(pages[0].number, 1);
  assert.match(pages[0].paragraphs.join(" "), /Harbor light/);
});

test("health-check EPUB paginates to three pages at the default size", async () => {
  const book = await readEpub(e2eReadingEpubBytes());
  const pages = paginateReaderBlocks(book.blocks, readerPageBox("m"));
  assert.equal(pages.length, 3);
  assert.equal(pageAfterTurn(1, pages.length, 1), 3);
  assert.match(pages[2].paragraphs.join(" "), /last buoy/);
});

test("html blocks ignore scripts and pdf info stays inside the file bytes", () => {
  const blocks = htmlToReaderBlocks(
    `<style>p{color:red}</style><script>alert(1)</script><p>Safe &amp; plain</p>`,
  );
  assert.deepEqual(blocks, [{ kind: "paragraph", text: "Safe & plain" }]);
  const nested = htmlToReaderBlocks(
    "<scr<script>ipt>alert(1)</script><style>p{color:red}</style ><p>Kept</p>",
  );
  assert.deepEqual(nested, [{ kind: "paragraph", text: "Kept" }]);
  const spacedEnd = htmlToReaderBlocks(
    "<script>alert(1)</script\t\n bar><style>x</style\t\n bar><p>Kept</p>",
  );
  assert.deepEqual(spacedEnd, [{ kind: "paragraph", text: "Kept" }]);

  const pdf = encoder.encode(
    "%PDF-1.4\n2 0 obj << /Type /Pages /Count 4 /Kids [3 0 R] >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF",
  );
  assert.deepEqual(inspectPdf(pdf), { pages: 4, encrypted: false });
  const locked = encoder.encode("%PDF-1.4\ntrailer << /Encrypt 9 0 R /Root 1 0 R >>\n%%EOF");
  assert.equal(inspectPdf(locked).encrypted, true);
  assert.equal(
    pdfViewerSrc("app://local/book.pdf?v=1", 3),
    "app://local/book.pdf?v=1#page=3&toolbar=0&navpanes=0&view=FitH",
  );
});

test("reader shell styles keep Literata metrics and the 1.5.0 radii", () => {
  const block = styles.slice(styles.indexOf("reader shell"));
  assert.match(block, /font-size:\s*12\.5px/);
  assert.match(block, /line-height:\s*19px/);
  assert.match(block, /font-size:\s*15px/);
  assert.match(block, /line-height:\s*23px/);
  assert.match(block, /270px/);
  assert.match(block, /340px/);
  assert.match(block, /112px/);
  assert.match(block, /padding:\s*26px 24px/);
  assert.match(block, /gap:\s*4px/);
  assert.match(block, /width:\s*340px/);
  assert.match(block, /width:\s*420px/);
  assert.match(block, /fonts\/literata-latin-400\.woff2/);
  assert.match(block, /--atomic-r-object/);
  assert.match(block, /--atomic-r-control/);
  assert.match(block, /--atomic-r-well/);
  assert.doesNotMatch(block, /#5b7cfa|#7c3aed|#8b5cf6|purple/i);
  assert.doesNotMatch(block, /column-gap|clip-path|!important/);
});

test("flight registration does not own the shell folders", () => {
  resetReaderMounts();
  registerReaderFlight({
    open() {
      return false;
    },
  });
  resetReaderMounts();
});
