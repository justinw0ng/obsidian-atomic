import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  booksPerRow,
  buildBookShelfItems,
  chunkItems,
  coverObjectPosition,
  bookClickOpensNote,
  hoverFinePointer,
  isBookShelfUnclipStop,
  parseCoverRef,
  resolveCoverSrc,
  sameBookShelfPaintState,
  shelfColorFor,
  shouldUnclipBookShelfAncestor,
  titleLengthClass,
  unclipBookShelfAncestors,
} from "../src/views/book-shelf.ts";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const stylesCss = readFileSync(join(repoRoot, "styles.css"), "utf8");

test("shelfColorFor uses valid spine_color and hashes missing colors", () => {
  assert.equal(
    shelfColorFor({
      title: "Atomic Habits",
      path: "atomics/hobbies/Reading/Items/Atomic Habits.md",
      spine_color: "#8B3A2A",
    }),
    "#8B3A2A",
  );
  assert.match(
    shelfColorFor({
      title: "Deep Work",
      path: "atomics/hobbies/Reading/Items/Deep Work.md",
    }),
    /^#[0-9a-f]{6}$/i,
  );
  assert.notEqual(
    shelfColorFor({
      title: "Deep Work",
      path: "atomics/hobbies/Reading/Items/Deep Work.md",
    }),
    shelfColorFor({
      title: "How to Read a Book",
      path: "atomics/hobbies/Reading/Items/How to Read a Book.md",
    }),
  );
});

test("buildBookShelfItems filters Reading atomic items and normalizes metadata", () => {
  const items = buildBookShelfItems([
    {
      path: "atomics/hobbies/Reading/Items/Finished.md",
      basename: "Finished",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "finished",
        authors: "Author One",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Current.md",
      basename: "Current",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "reading",
        authors: ["Author Two", "Author Three"],
        cover: "https://example.invalid/current.jpg",
        description: "A useful book.",
        spine_color: "#336699",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Other.md",
      basename: "Other",
      frontmatter: {
        type: "atomic-item",
        activity: "gaming",
      },
    },
  ]);

  assert.deepEqual(
    items.map((item) => item.title),
    ["Current", "Finished"],
  );
  assert.deepEqual(items[0], {
    path: "atomics/hobbies/Reading/Items/Current.md",
    title: "Current",
    authors: ["Author Two", "Author Three"],
    status: "reading",
    description: "A useful book.",
    spineColor: "#336699",
    cover: "https://example.invalid/current.jpg",
  });
  assert.deepEqual(items[1].authors, ["Author One"]);
});

test("buildBookShelfItems filters by status when requested", () => {
  const files = [
    {
      path: "atomics/hobbies/Reading/Items/Current.md",
      basename: "Current",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "reading",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Queue.md",
      basename: "Queue",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "to-read",
      },
    },
    {
      path: "atomics/hobbies/Reading/Items/Done.md",
      basename: "Done",
      frontmatter: {
        type: "atomic-item",
        activity: "reading",
        status: "finished",
      },
    },
  ];

  assert.deepEqual(
    buildBookShelfItems(files, "reading", ["reading"]).map((item) => item.title),
    ["Current"],
  );
  assert.deepEqual(
    buildBookShelfItems(files, "reading", ["reading", "to-read"]).map(
      (item) => item.title,
    ),
    ["Current", "Queue"],
  );
  assert.equal(buildBookShelfItems(files, "reading", null).length, 3);
});

test("parseCoverRef accepts URLs, vault paths, and wikilinks", () => {
  assert.deepEqual(parseCoverRef(""), { kind: "none" });
  assert.deepEqual(parseCoverRef("https://example.invalid/a.jpg"), {
    kind: "url",
    src: "https://example.invalid/a.jpg",
  });
  assert.deepEqual(parseCoverRef("app://local/cover.png"), {
    kind: "url",
    src: "app://local/cover.png",
  });
  assert.deepEqual(
    parseCoverRef("[[atomics/hobbies/Reading/Covers/title.jpg]]"),
    {
      kind: "vault",
      path: "atomics/hobbies/Reading/Covers/title.jpg",
    },
  );
  assert.deepEqual(
    parseCoverRef("[[atomics/hobbies/Reading/Covers/title.jpg|Cover]]"),
    {
      kind: "vault",
      path: "atomics/hobbies/Reading/Covers/title.jpg",
    },
  );
  assert.deepEqual(parseCoverRef("atomics/hobbies/Reading/Covers/title.jpg"), {
    kind: "vault",
    path: "atomics/hobbies/Reading/Covers/title.jpg",
  });
});

test("resolveCoverSrc uses URLs directly and vault resolver for paths", () => {
  const data = {
    resolveResourcePath(path, sourcePath) {
      assert.equal(path, "atomics/hobbies/Reading/Covers/title.jpg");
      assert.equal(sourcePath, "atomics/hobbies/Reading/Items/Current.md");
      return "app://local/resolved.jpg";
    },
  };

  assert.equal(
    resolveCoverSrc(
      "https://example.invalid/a.jpg",
      data,
      "atomics/hobbies/Reading/Items/Current.md",
    ),
    "https://example.invalid/a.jpg",
  );
  assert.equal(
    resolveCoverSrc(
      "[[atomics/hobbies/Reading/Covers/title.jpg]]",
      data,
      "atomics/hobbies/Reading/Items/Current.md",
    ),
    "app://local/resolved.jpg",
  );
  assert.equal(
    resolveCoverSrc("", data, "atomics/hobbies/Reading/Items/Current.md"),
    null,
  );
});

test("bookClickOpensNote waits for a second tap on coarse pointers", () => {
  assert.equal(bookClickOpensNote({ hoverFine: true, coverOpen: false }), true);
  assert.equal(bookClickOpensNote({ hoverFine: true, coverOpen: true }), true);
  assert.equal(bookClickOpensNote({ hoverFine: false, coverOpen: false }), false);
  assert.equal(bookClickOpensNote({ hoverFine: false, coverOpen: true }), true);
});

test("hoverFinePointer follows the hover+fine media query", () => {
  assert.equal(hoverFinePointer(null), false);
  assert.equal(hoverFinePointer({ matches: false }), false);
  assert.equal(hoverFinePointer({ matches: true }), true);
});

test("coverObjectPosition crops wide 3D mockups to the front face", () => {
  // Upright 2:3 (and the shelf face ~80×124) stay centered.
  assert.equal(coverObjectPosition(400, 600), "center");
  assert.equal(coverObjectPosition(80, 124), "center");
  // Photos / 3D renders that include a left spine are wider than 2:3.
  assert.equal(coverObjectPosition(500, 600), "right center");
  assert.equal(coverObjectPosition(510, 600), "right center");
  assert.equal(coverObjectPosition(0, 600), "center");
  assert.equal(coverObjectPosition(400, 0), "center");
});

test("titleLengthClass shrinks type for long book titles", () => {
  assert.equal(titleLengthClass("Blink"), "");
  assert.equal(titleLengthClass("Building a Second Brain"), "is-title-sm");
  assert.equal(
    titleLengthClass("Thinking, Fast and Slow — Annotated Edition"),
    "is-title-xs",
  );
});

test("booksPerRow and chunkItems wrap to multiple shelf rows by width", () => {
  assert.equal(booksPerRow(0), 3);
  assert.equal(booksPerRow(100), 3);
  // Never wrap below 3; 20 + 3*96 + 2*6 = 320
  assert.equal(booksPerRow(320), 3);
  // 20 + 4*96 + 3*6 = 422
  assert.equal(booksPerRow(422), 4);
  // 20 + 8*96 + 7*6 = 830
  assert.equal(booksPerRow(830), 8);

  assert.deepEqual(chunkItems([], 3), [[]]);
  assert.deepEqual(
    chunkItems(["a", "b", "c", "d", "e"], 2),
    [["a", "b"], ["c", "d"], ["e"]],
  );
});

test("shouldUnclipBookShelfAncestor targets codeblock wrappers only", () => {
  assert.equal(shouldUnclipBookShelfAncestor("cm-preview-code-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("markdown-rendered-code-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("cm-embed-block"), true);
  assert.equal(shouldUnclipBookShelfAncestor("internal-embed markdown-embed"), true);
  assert.equal(shouldUnclipBookShelfAncestor("markdown-preview-sizer"), false);
  assert.equal(shouldUnclipBookShelfAncestor(""), false);
});

test("isBookShelfUnclipStop keeps note scroll containers intact", () => {
  assert.equal(isBookShelfUnclipStop("markdown-preview-view"), true);
  assert.equal(isBookShelfUnclipStop("markdown-source-view mod-cm6"), true);
  assert.equal(isBookShelfUnclipStop("cm-scroller"), true);
  assert.equal(isBookShelfUnclipStop("workspace-leaf-content"), true);
  assert.equal(isBookShelfUnclipStop("cm-preview-code-block"), false);
});

test("unclipBookShelfAncestors opens codeblock overflow and stops at the note scroller", () => {
  const overflowEl = (className, overflow, parent = null) => {
    const el = {
      className,
      style: { overflow },
      parentElement: parent,
      setCssStyles(styles) {
        Object.assign(this.style, styles);
      },
    };
    return el;
  };
  const scroller = overflowEl("cm-scroller", "auto");
  const sizer = overflowEl("markdown-preview-sizer", "auto", scroller);
  const preview = overflowEl(
    "cm-preview-code-block markdown-rendered-code-block",
    "hidden",
    sizer,
  );
  const host = overflowEl("", "hidden", preview);
  const el = overflowEl("", "hidden", host);

  unclipBookShelfAncestors(el);

  assert.equal(el.style.overflow, "visible");
  assert.equal(host.style.overflow, "visible");
  assert.equal(preview.style.overflow, "visible");
  assert.equal(sizer.style.overflow, "auto");
  assert.equal(scroller.style.overflow, "auto");
});

test("book shelf reads the title under the plank and opens the note", () => {
  const source = readFileSync(
    join(repoRoot, "src/views/book-shelf.ts"),
    "utf8",
  );
  assert.match(source, /atomic-shelf-readout/);
  assert.match(source, /showBookReadout/);
  assert.match(source, /data\.openPath\(item\.path\)/);
  assert.doesNotMatch(source, /bookDetailFixedPosition/);
  assert.doesNotMatch(source, /is-ported/);
});

test("sameBookShelfPaintState skips equal built items even on a new array", () => {
  const items = [
    {
      path: "atomics/hobbies/Reading/Items/One.md",
      title: "One",
      authors: ["Ada"],
      status: "reading",
      spineColor: "#8B3A2A",
    },
  ];
  const state = {
    items,
    activityId: "reading",
    hasActivity: true,
    scale: 1,
    language: "en",
    statuses: null,
    invalidStatuses: [],
  };
  assert.equal(sameBookShelfPaintState(state, { ...state, items }), true);
  assert.equal(
    sameBookShelfPaintState(state, { ...state, items: [{ ...items[0] }] }),
    true,
  );
  assert.equal(
    sameBookShelfPaintState(state, {
      ...state,
      items: [{ ...items[0], status: "finished" }],
    }),
    false,
  );
  assert.equal(
    sameBookShelfPaintState(state, {
      ...state,
      items: [{ ...items[0], authors: ["Ada", "Grace"] }],
    }),
    false,
  );
  assert.equal(
    sameBookShelfPaintState(state, { ...state, language: "zh-Hant-en" }),
    false,
  );
  assert.equal(sameBookShelfPaintState(state, { ...state, scale: 1.5 }), false);

  const painted = buildBookShelfItems(
    [
      {
        path: items[0].path,
        basename: "One",
        frontmatter: {
          type: "atomic-item",
          activity: "reading",
          title: "One",
          status: "reading",
          authors: ["Ada"],
          spine_color: "#8B3A2A",
          tags: ["ignored-a"],
        },
      },
    ],
    "reading",
    null,
  );
  const paintedOtherTags = buildBookShelfItems(
    [
      {
        path: items[0].path,
        basename: "One",
        frontmatter: {
          type: "atomic-item",
          activity: "reading",
          title: "One",
          status: "reading",
          authors: ["Ada"],
          spine_color: "#8B3A2A",
          tags: ["ignored-b"],
        },
      },
    ],
    "reading",
    null,
  );
  assert.equal(
    sameBookShelfPaintState(
      { ...state, items: painted },
      { ...state, items: paintedOtherTags },
    ),
    true,
  );
});

test("book shelf skip uses cached files and throttles layout", () => {
  const source = readFileSync(join(repoRoot, "src/views/book-shelf.ts"), "utf8");
  assert.match(source, /listHobbyItems/);
  assert.match(source, /sameBookShelfPaintState/);
  assert.match(source, /bookShelfPaint\.shouldSkip\(el, paintState\)/);
  assert.match(source, /buildBookShelfItems\(files/);
  assert.match(
    source,
    /const items = activity[\s\S]*bookShelfPaint\.shouldSkip\(el, paintState\)/,
  );
  assert.doesNotMatch(source, /SHELF_FRONTMATTER_KEYS/);
  assert.doesNotMatch(source, /sameHobbyShelfFile/);
  assert.doesNotMatch(source, /bookShelfItemKey/);
  assert.doesNotMatch(source, /OPENING_CLASS/);
  assert.match(source, /requestBookShelfLayout/);
  assert.match(source, /ResizeObserver\(\(\) => \{\s*requestBookShelfLayout/s);
  const heatmapModel = readFileSync(
    join(repoRoot, "src/util/heatmap-model.ts"),
    "utf8",
  );
  assert.doesNotMatch(heatmapModel, /BookShelfPaintState/);
  assert.doesNotMatch(heatmapModel, /sameBookShelfPaintState/);
});

test("book shelf CSS tilts the cover and reads the book out under the plank", () => {
  assert.match(stylesCss, /\.atomic-shelf-readout/);
  assert.match(stylesCss, /\.atomic-plank/);
  assert.match(stylesCss, /perspective\(700px\)/);
  assert.match(stylesCss, /\.atomic-book-ribbon::before/);
  assert.doesNotMatch(stylesCss, /rotateY\(-155deg\)/);
  assert.doesNotMatch(stylesCss, /:has\(/);
  assert.doesNotMatch(stylesCss, /!important/);
  assert.doesNotMatch(stylesCss, /atomic-book-detail/);
});
