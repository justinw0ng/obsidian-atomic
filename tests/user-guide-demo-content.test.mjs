import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { bookShelfHostMarkdown } from "../src/hobbies/book-shelf-host.ts";
import {
  BOOK_SHELF_NOTE,
  DEMO_AUTHORS,
  FORBIDDEN_PUBLISHER_TITLES,
  HEATMAP_GRID_NOTE,
  HEATMAP_READING_NOTE,
  OPEN_COVER_TITLE,
  TIMER_ITEM_TITLE,
  TODAY_NOTE,
  USER_GUIDE_VAULT,
  assertOriginalDemoNotes,
  patchReadingItems,
  seedDemoVaultArgs,
  writeUserGuideNotes,
} from "../scripts/prepare-user-guide-vault.mjs";

test("demo titles used in user-guide shots are original", () => {
  const titles = Object.keys(DEMO_AUTHORS);
  assert.ok(titles.includes(TIMER_ITEM_TITLE));
  assert.ok(titles.includes(OPEN_COVER_TITLE));
  for (const title of titles) {
    assert.equal(FORBIDDEN_PUBLISHER_TITLES.includes(title), false);
  }
  assert.ok(FORBIDDEN_PUBLISHER_TITLES.includes("Atomic Habits"));
  assert.ok(FORBIDDEN_PUBLISHER_TITLES.includes("How to Read a Book"));
});

test("patchReadingItems writes invented authors and local covers", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-guide-notes-"));
  try {
    const items = join(vault, "atomics/hobbies/Reading/Items");
    mkdirSync(items, { recursive: true });
    writeFileSync(
      join(items, `${TIMER_ITEM_TITLE}.md`),
      `---
authors:
  - James Clear
cover: "https://covers.openlibrary.org/b/id/12539702-L.jpg"
---

# ${TIMER_ITEM_TITLE}
`,
    );
    writeFileSync(
      join(items, `${OPEN_COVER_TITLE}.md`),
      `---
authors:
  - ""
cover: ""
---

# ${OPEN_COVER_TITLE}
`,
    );
    writeUserGuideNotes(vault);
    patchReadingItems(vault);
    assertOriginalDemoNotes(vault);

    const timer = readFileSync(join(items, `${TIMER_ITEM_TITLE}.md`), "utf8");
    assert.match(timer, /Mara Ellison/);
    assert.match(timer, /the-unhurried-advantage\.png/);
    assert.match(timer, /timer_started_at: "2026-08-11T14:20:00.000Z"/);
    assert.doesNotMatch(timer, /openlibrary/i);

    const shelf = readFileSync(
      join(vault, "atomics/hobbies/Reading/Book Shelf.md"),
      "utf8",
    );
    assert.equal(shelf, BOOK_SHELF_NOTE);
    assert.equal(shelf, bookShelfHostMarkdown("en"));
    assert.match(shelf, /```atomic-bookshelf\n# Uncomment a line to use it/);
    assert.match(shelf, /^activity: reading  # /m);
    assert.match(shelf, /# status: all  # /);
    assert.match(shelf, /# scale: 1  # /);
    assert.doesNotMatch(shelf, /^ /m);

    const heatmap = readFileSync(join(vault, "atomics/Heatmap.md"), "utf8");
    assert.equal(heatmap, HEATMAP_GRID_NOTE);
    assert.match(heatmap, /activity: gym, golf, reading/);
    const readingHeatmap = readFileSync(join(vault, "atomics/Heatmap reading.md"), "utf8");
    assert.equal(readingHeatmap, HEATMAP_READING_NOTE);
    const today = readFileSync(join(vault, "atomics/Today.md"), "utf8");
    assert.equal(today, TODAY_NOTE);
    assert.match(today, /date: 2026-08-11/);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});

test("prepareUserGuideVault seeds the vault it patches", () => {
  const vault = "/tmp/atomic-user-guide-vault";
  const args = seedDemoVaultArgs(vault);
  assert.equal(args.at(-2), "--vault");
  assert.equal(args.at(-1), vault);
  assert.notEqual(vault, USER_GUIDE_VAULT);
  assert.deepEqual(seedDemoVaultArgs(), [
    args[0],
    "--vault",
    USER_GUIDE_VAULT,
  ]);
});

test("capture script continues without xdotool when setRect works", () => {
  const root = join(dirname(fileURLToPath(import.meta.url)), "..");
  const shared = readFileSync(join(root, "scripts/docs-capture.mjs"), "utf8");
  const src = readFileSync(join(root, "scripts/capture-user-guide-screenshots.mjs"), "utf8");
  const gif = readFileSync(join(root, "scripts/docs-gif.mjs"), "utf8");
  assert.match(shared, /error\?\.code === "ENOENT"/);
  assert.match(shared, /xdotool is not installed/);
  assert.match(shared, /setRectOk/);
  assert.match(shared, /compose-device-hero\.py/);
  assert.match(shared, /export function ensureDocsBundle/);
  assert.match(shared, /export function restoreBundledMain/);
  assert.match(src, /from "\.\/docs-capture\.mjs"/);
  assert.match(src, /ensureDocsBundle/);
  assert.match(src, /restoreBundledMain/);
  assert.match(src, /launchObsidian/);
  assert.match(src, /atomic-dashboard-hero\.png/);
  assert.match(src, /DASHBOARD_MOBILE/);
  assert.match(src, /ATOMIC_DOCS_SHOTS/);
  assert.match(src, /wantShot\("bookShelf"\)/);
  assert.match(src, /wantShot\("cuePopup"\)/);
  assert.match(src, /\["dashboard", captureDashboardGif\]/);
  assert.match(src, /captureFullPageProof/);
  assert.match(src, /composeDashboardHero/);
  assert.match(src, /from "\.\/docs-gif\.mjs"/);
  assert.match(src, /atomic-book-shelf\.gif/);
  assert.match(src, /atomic-cues-hover\.gif/);
  assert.match(src, /atomic-cue-popup\.gif/);
  assert.match(src, /assembleGif/);
  assert.match(src, /atomic-cue-log/);
  assert.doesNotMatch(src, /bootstrapMissingGifs/);
  assert.doesNotMatch(src, /assertDashboardBundle/);
  assert.doesNotMatch(src, /ensureCaptureBundle/);
  assert.doesNotMatch(src, /\/cursor\/stores\//);
  assert.doesNotMatch(gif, /\/cursor\/stores\//);
  assert.doesNotMatch(gif, /assembleCueHoverPreviewGif/);
  assert.match(gif, /ATOMIC_CUE_POPUP_STILLS/);
});
