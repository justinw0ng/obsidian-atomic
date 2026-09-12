/**
 * Cue-card README hero: seed, wait/pop cards, compose without cropping chrome.
 *
 * Launch/resize/preview/park/compose live in e2e/lib/obsidian.mjs + docs-capture.mjs.
 * Run: npm run docs:cue-hero
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CUE_HERO_FILES, CUE_HERO_HEADLINE } from "./cue-hero-content.mjs";
import {
  composeDeviceHero,
  hideCaptureScrollbars,
  openPreviewNote,
  parkMouse,
  resizeWindow,
} from "./docs-capture.mjs";
import { DEFAULT_DEMO_VAULT } from "./hero-capture-options.mjs";
import {
  ARTIFACT_DIR,
  attachSelenium,
  dismissTrustDialog,
  e2eSkipReason,
  launchObsidian,
  saveScreenshot,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const VAULT = process.env.VAULT_PATH || DEFAULT_DEMO_VAULT;
const SHOT_DIR = "/tmp/atomic-cue-hero-shots";
const DEFAULT_CUE_HERO_REVIEW = "/tmp/atomic-cue-hero-review";
const REVIEW_DIR = process.env.ATOMIC_CUE_HERO_REVIEW || DEFAULT_CUE_HERO_REVIEW;
const WALKTHROUGH_DIR = "/opt/cursor/artifacts";
const HERO_OUT = join(ROOT, "docs/images/atomic-cue-hero.png");
const GIF_OUT = join(ROOT, "docs/images/atomic-cue-hero.gif");
const DESKTOP = { width: 1600, height: 900 };
const MOBILE = { width: 390, height: 844 };
const HOVER_INDEX = 1;
const TAP_INDEX = 1;

/** Capture-only: hide chrome, hide scrollbar thumbs, center the phone fan. */
const CUE_HERO_CSS = `
.workspace-ribbon,
.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.status-bar,
.titlebar,
.titlebar-button-container,
.view-header,
.workspace-tab-header-container,
.workspace-sidedock-vault-profile,
.mod-root .workspace-tabs .workspace-tab-header-container,
.sidebar-toggle-button,
.workspace-drawer-vault-profile,
.metadata-container,
.metadata-properties-heading,
.metadata-add-button {
  display: none !important;
}

.workspace-split.mod-root,
.workspace-leaf,
.workspace-leaf-content,
.view-content {
  margin: 0 !important;
  padding: 0 !important;
  max-width: 100% !important;
}

.markdown-preview-view,
.markdown-source-view.mod-cm6 .cm-scroller {
  padding-top: 20px !important;
  padding-left: 28px !important;
  padding-right: 28px !important;
  overflow: hidden !important;
}

body, html, .fitness-plugin, .atomic-block-host {
  --scrollbar-thumb-bg: transparent !important;
  --scrollbar-active-thumb-bg: transparent !important;
  --scrollbar-bg: transparent !important;
  --scrollbar-size: 0px !important;
}

.fitness-plugin .atomic-book-row-books,
.fitness-plugin .fitness-heatmap-scroll,
.fitness-plugin .atomic-book-shelf-row,
.fitness-plugin .atomic-scrollport,
.atomic-block-host,
.markdown-preview-view,
.markdown-reading-view,
.cm-scroller,
.view-content,
.workspace-leaf-content {
  overflow: hidden !important;
}

.fitness-plugin .atomic-cue-fan {
  justify-content: center;
  justify-items: center;
  padding-top: 36px;
  overflow: visible !important;
}

@media (max-width: 600px) {
  .markdown-preview-sizer,
  .fitness-plugin.atomic-cues,
  .fitness-plugin.atomic-cue-log {
    margin-left: auto !important;
    margin-right: auto !important;
  }

  .fitness-plugin .atomic-cue-fan {
    justify-content: center;
    justify-items: center;
  }

  .fitness-plugin .atomic-cue-card {
    width: min(100%, var(--atomic-cue-width)) !important;
    margin-left: auto !important;
    margin-right: auto !important;
  }
}

.atomic-cue-lightbox,
.atomic-cue-lightbox-card,
.atomic-cue-lightbox .atomic-cue-body {
  overflow: hidden !important;
}
`;

function ensureCueCardBundle() {
  const bundlePath = join(ROOT, "main.js");
  if (readFileSync(bundlePath, "utf8").includes("atomic-cue-card")) return false;
  const result = spawnSync("npm", ["run", "build"], { cwd: ROOT, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`build failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (!readFileSync(bundlePath, "utf8").includes("atomic-cue-card")) {
    throw new Error("main.js is still missing atomic-cue-card after build");
  }
  return true;
}

function restoreBundledMain(built) {
  if (!built) return;
  spawnSync("git", ["checkout", "--", "main.js"], { cwd: ROOT, stdio: "ignore" });
}

function runSeed() {
  const result = spawnSync(
    process.execPath,
    [join(ROOT, "scripts/seed-readme-demo-vault.mjs"), "--vault", VAULT, "--cue-hero"],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`seed failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

function installMinimalTheme() {
  const dest = join(VAULT, ".obsidian/themes/Minimal");
  mkdirSync(dest, { recursive: true });
  if (existsSync(join(dest, "theme.css")) && existsSync(join(dest, "manifest.json"))) {
    return;
  }
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

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function patchCaptureAppearance() {
  const snippetDir = join(VAULT, ".obsidian/snippets");
  mkdirSync(snippetDir, { recursive: true });
  writeFileSync(join(snippetDir, "hero-note-only.css"), CUE_HERO_CSS);

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

async function openHeroNote(driver, path) {
  await openPreviewNote(driver, path);
  await hideCaptureScrollbars(driver, CUE_HERO_CSS);
}

async function waitForVaultNotes(driver, prefix, min) {
  await driver.wait(async () => {
    const count = await driver.executeScript(
      `
      return app.vault.getMarkdownFiles()
        .filter((file) => file.path.startsWith(arguments[0])).length
      `,
      prefix,
    );
    return count >= min;
  }, 90000);
}

async function nudgeGolfIndex(driver) {
  const result = await driver.executeAsyncScript(`
    const done = arguments[0];
    const path = "atomics/exercise/Golf/2026/2026-08-11.md";
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
      done({ ok: false, error: "missing " + path });
      return;
    }
    app.vault.process(file, (current) => current).then(
      () => done({ ok: true }),
      (err) => done({ ok: false, error: String(err) }),
    );
  `);
  if (!result?.ok) {
    throw new Error(`could not nudge golf index: ${result?.error || "unknown"}`);
  }
  await sleep(800);
}

async function cueHeroDiagnostics(driver) {
  return driver.executeScript(`
    const plugin = app.plugins.plugins["atomic-tracker"];
    const cues = document.querySelector('[data-testid="atomic-cues"]');
    const golfFiles = app.vault.getMarkdownFiles().filter((file) => (
      file.path.startsWith("atomics/exercise/Golf/2026/")
    ));
    return {
      file: app.workspace.getActiveFile()?.path || "",
      cardCount: document.querySelectorAll('[data-testid="atomic-cue-card"]').length,
      cuesText: (cues?.innerText || "").slice(0, 240),
      golfFiles: golfFiles.length,
      golfFolder: plugin?.settings?.activityTypes?.find((activity) => activity.id === "golf")?.folder || "",
    };
  `);
}

async function waitForCueCards(driver, min = 10) {
  await waitCss(driver, '[data-testid="atomic-cues"][data-activity="golf"]', 30000);
  try {
    await driver.wait(async () => {
      const count = await driver.executeScript(
        `return document.querySelectorAll('[data-testid="atomic-cue-card"]').length`,
      );
      return count >= min;
    }, 60000);
  } catch (error) {
    const info = await cueHeroDiagnostics(driver);
    throw new Error(
      `cue cards ${info.cardCount} < ${min} (${JSON.stringify(info)}): ${
        error instanceof Error ? error.message : error
      }`,
    );
  }
  await driver.executeScript(`return document.fonts.ready`);
  await sleep(400);
}

async function visibleCueIndex(driver, preferIndex) {
  const found = await driver.executeScript(
    `
    const cards = [...document.querySelectorAll('[data-testid="atomic-cue-card"]')];
    const visible = cards
      .map((card, index) => {
        const rect = card.getBoundingClientRect();
        return { index, width: rect.width, height: rect.height };
      })
      .filter((card) => card.width > 40 && card.height > 40);
    if (!visible.length) return -1;
    return visible[Math.min(arguments[0], visible.length - 1)].index;
    `,
    preferIndex,
  );
  if (found < 0) throw new Error("no visible cue card");
  return found;
}

async function closeAllCues(driver) {
  await driver.executeScript(`
    if (document.querySelector('[data-testid="atomic-cue-lightbox"]')) {
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    }
    document.querySelectorAll('[data-testid="atomic-cue-card"]').forEach((card) => {
      card.classList.remove("is-preview");
      card.setAttribute("aria-expanded", "false");
    });
  `);
  await sleep(280);
}

async function waitForLightbox(driver) {
  await driver.wait(async () => {
    return driver.executeScript(`
      const overlay = document.querySelector('[data-testid="atomic-cue-lightbox"]');
      return !!overlay?.classList.contains("is-placed");
    `);
  }, 8000);
  await sleep(300);
}

async function openLightbox(driver, preferIndex) {
  const index = await visibleCueIndex(driver, preferIndex);
  await driver.executeScript(
    `
    const card = document.querySelectorAll('[data-testid="atomic-cue-card"]')[arguments[0]];
    if (!card) throw new Error("missing cue card " + arguments[0]);
    card.scrollIntoView({ block: "center", inline: "nearest" });
    card.click();
    `,
    index,
  );
  await waitForLightbox(driver);
}

async function popCue(driver, preferIndex) {
  const index = await visibleCueIndex(driver, preferIndex);
  await driver.executeScript(
    `
    const cards = [...document.querySelectorAll('[data-testid="atomic-cue-card"]')];
    const card = cards[arguments[0]];
    if (!card) throw new Error("missing cue card " + arguments[0]);
    card.scrollIntoView({ block: "center", inline: "nearest" });
    for (const other of cards) other.classList.remove("is-preview");
    card.classList.add("is-preview");
    `,
    index,
  );
  await driver.wait(async () => {
    return driver.executeScript(
      `
      const card = document.querySelectorAll('[data-testid="atomic-cue-card"]')[arguments[0]];
      const meta = card?.querySelector(".atomic-cue-meta");
      return !!card?.classList.contains("is-preview") && !!meta && Number(getComputedStyle(meta).opacity) > 0.5;
      `,
      index,
    );
  }, 8000);
  await sleep(250);
}

async function captureNamed(driver, name) {
  await driver.executeScript(
    `document.querySelectorAll(".notice, .tooltip").forEach((el) => el.remove())`,
  );
  const src = await saveScreenshot(driver, name);
  const dest = join(SHOT_DIR, `${name}.png`);
  mkdirSync(SHOT_DIR, { recursive: true });
  copyFileSync(src, dest);
  trimShotWhitespace(dest);
  return dest;
}

function trimShotWhitespace(path) {
  const result = spawnSync(
    "python3",
    [join(ROOT, "scripts/trim-hero-shot.py"), path],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`trim shot failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

function composeCueHero(desktopPath, mobilePath) {
  return composeDeviceHero({
    desktop: desktopPath,
    mobile: mobilePath,
    out: HERO_OUT,
    headline: CUE_HERO_HEADLINE,
    cropChrome: false,
    desktopFit: "contain",
    phoneFit: "contain",
    mobileKind: "window",
    phonePad: 22,
    scrubScrollbars: true,
  });
}

function writeCueHeroGif(stills) {
  const result = spawnSync(
    "python3",
    [
      join(ROOT, "scripts/animate-cue-hero-gif.py"),
      "--rest",
      stills.desktopRest,
      "--hover",
      stills.desktopHover,
      "--lightbox",
      stills.desktopLightbox,
      "--mobile-rest",
      stills.mobileRest,
      "--mobile-lightbox",
      stills.mobileLightbox,
      "--out",
      GIF_OUT,
      "--headline",
      CUE_HERO_HEADLINE,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`cue hero gif failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  console.log((result.stdout || "").trim() || `Wrote ${GIF_OUT}`);
  return GIF_OUT;
}

function publishStills(paths) {
  for (const dir of [REVIEW_DIR, WALKTHROUGH_DIR, ARTIFACT_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
  for (const [name, src] of Object.entries(paths)) {
    if (!src || !existsSync(src)) continue;
    const ext = src.endsWith(".gif") ? ".gif" : ".png";
    const filename = `${name}${ext}`;
    copyFileSync(src, join(REVIEW_DIR, filename));
    copyFileSync(src, join(WALKTHROUGH_DIR, filename));
  }
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) throw new Error(`Cannot capture cue hero: ${skip}`);

  const built = ensureCueCardBundle();
  try {
    runSeed();
    installMinimalTheme();
    patchCaptureAppearance();

    const launched = await launchObsidian(VAULT, "atomics/Dashboard.md");
    const driver = await attachSelenium(undefined, launched.version);
    try {
      await switchToObsidianWindow(driver);
      await waitForPlugin(driver);
      await dismissTrustDialog(driver);
      await waitForVaultNotes(driver, "atomics/exercise/Golf/2026/", 50);
      await nudgeGolfIndex(driver);

      await resizeWindow(driver, DESKTOP.width, DESKTOP.height);
      await openHeroNote(driver, CUE_HERO_FILES.golfCues);
      await waitForCueCards(driver);
      await parkMouse(driver);
      await sleep(400);
      const desktopRest = await captureNamed(driver, "cue_hero_desktop_rest");

      await popCue(driver, HOVER_INDEX);
      const desktopHover = await captureNamed(driver, "cue_hero_desktop_hover");

      await openLightbox(driver, HOVER_INDEX);
      const desktopLightbox = await captureNamed(driver, "cue_hero_desktop_lightbox");

      await resizeWindow(driver, MOBILE.width, MOBILE.height);
      await openHeroNote(driver, CUE_HERO_FILES.golfCues);
      await waitForCueCards(driver);
      await hideCaptureScrollbars(driver, CUE_HERO_CSS);
      await closeAllCues(driver);
      await parkMouse(driver);
      await sleep(500);
      const mobileRest = await captureNamed(driver, "cue_hero_mobile_rest");

      await openLightbox(driver, TAP_INDEX);
      const mobileLightbox = await captureNamed(driver, "cue_hero_mobile_lightbox");

      await resizeWindow(driver, DESKTOP.width, DESKTOP.height);
      await openHeroNote(driver, CUE_HERO_FILES.golfToday);
      await waitCss(driver, '[data-testid="atomic-cue-log"]');
      await waitCss(driver, '[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]');
      await hideCaptureScrollbars(driver, CUE_HERO_CSS);
      await parkMouse(driver);
      await sleep(400);
      const form = await captureNamed(driver, "cue_hero_form");

      const hero = composeCueHero(desktopLightbox, mobileLightbox);
      const gif = writeCueHeroGif({
        desktopRest,
        desktopHover,
        desktopLightbox,
        mobileRest,
        mobileLightbox,
      });
      publishStills({
        cue_hero_desktop_rest: desktopRest,
        cue_hero_desktop_hover: desktopHover,
        cue_hero_desktop_lightbox: desktopLightbox,
        cue_hero_mobile_rest: mobileRest,
        cue_hero_mobile_lightbox: mobileLightbox,
        cue_hero_form: form,
        atomic_cue_hero: hero,
        atomic_cue_hero_gif: gif,
      });
      console.log(`Review stills: ${REVIEW_DIR}`);
    } finally {
      await stopSession({ driver });
    }
  } finally {
    restoreBundledMain(built);
  }
}

await main();
