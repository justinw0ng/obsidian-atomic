/**
 * Live daily-note shots for the README hero.
 * The shell script frames these into the shared desktop and phone chrome.
 *
 * Run: node scripts/capture-daily-hero.mjs
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ensureDocsBundle,
  hideCaptureScrollbars,
  hideNoteProperties,
  openPreviewNote,
  parkMouse,
  resizeWindow,
  restoreBundledMain,
} from "./docs-capture.mjs";
import { capturePreviewCrop, heroHoleSize } from "./hero-frames.mjs";
import { DEFAULT_DEMO_VAULT } from "./hero-capture-options.mjs";
import {
  attachSelenium,
  dismissTrustDialog,
  e2eSkipReason,
  launchObsidian,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = process.env.VAULT_PATH || DEFAULT_DEMO_VAULT;
const SHOT_DIR = "/tmp/atomic-hero-shots";
const DAILY = "Daily notes/2026-08-11.md";

const DAILY_CSS = `
.workspace-ribbon,
.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.status-bar,
.titlebar,
.titlebar-button-container,
.view-header,
.workspace-tab-header-container,
.metadata-container {
  display: none !important;
}
.markdown-preview-view {
  padding-top: 20px !important;
  padding-left: 28px !important;
  padding-right: 28px !important;
  overflow: hidden !important;
}
.fitness-plugin .atomic-book-row-books,
.fitness-plugin .fitness-heatmap-scroll,
.fitness-plugin .atomic-book-shelf-row {
  overflow: hidden !important;
}
`;

function runSeed(bookLimit) {
  const args = [join(ROOT, "scripts/seed-readme-demo-vault.mjs"), "--vault", VAULT];
  if (bookLimit) args.push("--book-limit", String(bookLimit));
  const result = spawnSync(process.execPath, args, { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`seed failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  console.log((result.stdout || "").trim());
}

function installMinimalTheme() {
  const dest = join(VAULT, ".obsidian/themes/Minimal");
  mkdirSync(dest, { recursive: true });
  if (existsSync(join(dest, "theme.css")) && existsSync(join(dest, "manifest.json"))) return;
  const tmp = "/tmp/obsidian-minimal";
  spawnSync("rm", ["-rf", tmp]);
  const clone = spawnSync(
    "git",
    ["clone", "--depth", "1", "https://github.com/kepano/obsidian-minimal.git", tmp],
    { encoding: "utf8" },
  );
  if (clone.status !== 0) {
    throw new Error(`Minimal theme clone failed: ${(clone.stderr || clone.stdout || "").trim()}`);
  }
  copyFileSync(join(tmp, "theme.css"), join(dest, "theme.css"));
  copyFileSync(join(tmp, "manifest.json"), join(dest, "manifest.json"));
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function patchCaptureAppearance() {
  const snippetDir = join(VAULT, ".obsidian/snippets");
  mkdirSync(snippetDir, { recursive: true });
  writeFileSync(join(snippetDir, "hero-note-only.css"), DAILY_CSS);
  const appPath = join(VAULT, ".obsidian/app.json");
  const app = readJson(appPath);
  app.readableLineLength = false;
  app.livePreview = true;
  app.baseFontSize = 15;
  app.theme = "moonstone";
  app.propertiesInDocument = "hidden";
  writeJson(appPath, app);
  const appearancePath = join(VAULT, ".obsidian/appearance.json");
  const appearance = readJson(appearancePath);
  appearance.theme = "moonstone";
  appearance.cssTheme = "Minimal";
  appearance.showRibbon = false;
  appearance.enabledCssSnippets = ["hero-note-only"];
  writeJson(appearancePath, appearance);
}

function coversLookReady(path, minStriped) {
  const result = spawnSync("python3", [join(ROOT, "scripts/verify-hero-covers.py"), path, String(minStriped)], {
    encoding: "utf8",
  });
  return result.status === 0;
}

async function captureShot(size, dest, minCovers, minStriped) {
  const launched = await launchObsidian(VAULT, DAILY);
  const driver = await attachSelenium(undefined, launched.version);
  try {
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
    await dismissTrustDialog(driver);
    await resizeWindow(driver, size.width, size.height);
    await openPreviewNote(driver, DAILY);
    await waitCss(driver, '[data-testid="atomic-bookshelf"]');
    const start = Date.now();
    let loaded = 0;
    while (Date.now() - start < 30000) {
      loaded = await driver.executeScript(`
        return [...document.querySelectorAll("img.atomic-book-cover")]
          .filter((img) => img.complete && img.naturalWidth > 40).length;
      `);
      if (loaded >= minCovers) break;
      await sleep(400);
    }
    if (loaded < minCovers) {
      throw new Error(`Cover images not ready (loaded ${loaded}, need ${minCovers})`);
    }
    await hideNoteProperties(driver);
    await hideCaptureScrollbars(driver, DAILY_CSS);
    await parkMouse(driver);
    await sleep(500);
    mkdirSync(SHOT_DIR, { recursive: true });
    await capturePreviewCrop(driver, dest);
    if (!coversLookReady(dest, minStriped)) {
      await sleep(800);
      await capturePreviewCrop(driver, dest);
    }
    if (!coversLookReady(dest, minStriped)) {
      throw new Error(`book covers were not ready in ${dest}`);
    }
    console.log(`Saved ${dest}`);
  } finally {
    await stopSession({ driver });
  }
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) throw new Error(`Cannot capture daily hero: ${skip}`);
  const built = ensureDocsBundle(["atomic-bookshelf"]);
  try {
    const phone = heroHoleSize("daily", "phone");
    // Wider than the chrome hole so twelve covers stay on one row.
    // The frame step then scales to the hole width and keeps the top.
    const desktop = { width: 1560, height: 1100 };
    runSeed();
    installMinimalTheme();
    patchCaptureAppearance();
    await captureShot(desktop, join(SHOT_DIR, "desktop.png"), 8, 8);
    runSeed(3);
    installMinimalTheme();
    patchCaptureAppearance();
    await captureShot(phone, join(SHOT_DIR, "mobile.png"), 2, 2);
  } finally {
    restoreBundledMain(built);
  }
}

await main();
