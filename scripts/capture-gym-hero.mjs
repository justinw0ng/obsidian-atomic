/**
 * Live gym-log shots for the README hero.
 * Paste them into the same desktop and phone chrome as the daily banner.
 *
 * Desktop keeps the stacked timer and gym-set wells, then the reminder /
 * cue-log form and example cue cards. Phone stays the first compact frame:
 * timer + gym set + set table only. The phone crop ends after Squat / Bench.
 * No Reminders heading, cue form, cue cards, or bullet list.
 *
 * Run: npm run docs:gym-hero
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  composeDeviceHero,
  ensureDocsBundle,
  hideCaptureScrollbars,
  hideNoteProperties,
  openPreviewNote,
  parkMouse,
  resizeWindow,
  restoreBundledMain,
} from "./docs-capture.mjs";
import { capturePreviewCrop, frameHeroContent, heroHoleSize, padHeroContent } from "./hero-frames.mjs";
import { DEFAULT_DEMO_VAULT } from "./hero-capture-options.mjs";
import { E2E_CUE_LOG_FENCE, E2E_TIMER_FENCE } from "../e2e/lib/vault.mjs";
import {
  ARTIFACT_DIR,
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
const SHOT_DIR = "/tmp/atomic-gym-hero-shots";
const REVIEW_DIR = process.env.ATOMIC_GYM_HERO_REVIEW || "/tmp/atomic-gym-hero-review";
const WALKTHROUGH_DIR = "/opt/cursor/artifacts";
const HERO_OUT = join(ROOT, "docs/images/atomic-gym-hero.png");
const GYM_NOTE = "atomics/exercise/Gym/2026/2026-08-11.md";
const GYM_HERO_HEADLINE = "Your sets. One gym note.";
const GYM_HERO_CUES = [
  "Brace before the first plate moves",
  "Knees track over the toes",
  "Finish the lockout, then breathe",
];

const DESKTOP = heroHoleSize("daily", "desktop");
const MOBILE = heroHoleSize("daily", "phone");

/** Capture-only: hide chrome, hide scrollbar thumbs, center the phone wells. */
const GYM_HERO_CSS = `
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
.fitness-plugin .atomic-heat-scroll,
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

.fitness-plugin .atomic-cue-fan,
.fitness-plugin .atomic-cue-log {
  overflow: hidden !important;
}

@media (max-width: 600px) {
  .markdown-preview-sizer,
  .fitness-plugin.atomic-timer,
  .fitness-plugin.atomic-gym-log,
  .fitness-plugin.atomic-cue-log {
    margin-left: auto !important;
    margin-right: auto !important;
  }
}
`;

function runSeed() {
  const result = spawnSync(
    process.execPath,
    [join(ROOT, "scripts/seed-readme-demo-vault.mjs"), "--vault", VAULT],
    { cwd: ROOT, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`seed failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

function writeGymHeroNote({ includeCues }) {
  const notePath = join(VAULT, GYM_NOTE);
  let markdown = readFileSync(notePath, "utf8");
  if (!markdown.includes("```atomic-timer")) {
    markdown = markdown.replace(
      /# Gym — 2026-08-11\n\n/,
      `# Gym — 2026-08-11\n\n${E2E_TIMER_FENCE}\n\n`,
    );
  }
  const reminders = includeCues
    ? `## Reminders

${E2E_CUE_LOG_FENCE}

${GYM_HERO_CUES.map((cue) => `- ${cue}`).join("\n")}
`
    : "";
  if (!/## Reminders/.test(markdown)) {
    throw new Error(`Missing Reminders heading in ${GYM_NOTE}`);
  }
  markdown = markdown.replace(/## Reminders\n[\s\S]*$/, reminders);
  if (!markdown.includes("```atomic-timer")) {
    throw new Error(`Could not stage the gym hero note at ${GYM_NOTE}`);
  }
  if (includeCues) {
    if (!markdown.includes("```atomic-cue-log")) {
      throw new Error(`Could not add the cue-log to ${GYM_NOTE}`);
    }
    for (const cue of GYM_HERO_CUES) {
      if (!markdown.includes(cue)) throw new Error(`Missing gym hero cue: ${cue}`);
    }
  }
  writeFileSync(notePath, markdown);
}

function installCaptureTheme() {
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
    throw new Error(`theme clone failed: ${(clone.stderr || clone.stdout || "").trim()}`);
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
  writeFileSync(join(snippetDir, "hero-note-only.css"), GYM_HERO_CSS);
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

function trimShotWhitespace(path) {
  const result = spawnSync("python3", [join(ROOT, "scripts/trim-hero-shot.py"), path], {
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`trim shot failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
}

async function openGymNote(driver, { waitForCues }) {
  await openPreviewNote(driver, GYM_NOTE);
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver, GYM_HERO_CSS);
  await waitCss(driver, '[data-testid="atomic-timer"]');
  await waitCss(driver, '[data-testid="atomic-gym-log"]');
  if (waitForCues) {
    await waitCss(driver, '[data-testid="atomic-cue-log"]');
    await waitCss(driver, '[data-testid="atomic-cue-log-existing"]');
    await driver.wait(async () => {
      const count = await driver.executeScript(
        `return document.querySelectorAll('[data-testid="atomic-cue-log"] [data-testid="atomic-cue-card"]').length`,
      );
      return count >= GYM_HERO_CUES.length;
    }, 20000);
  }
  await driver.executeScript(`return document.fonts.ready`);
  await driver.executeScript(`
    document.querySelector('[data-testid="atomic-timer"]')
      ?.scrollIntoView({ block: "start", inline: "nearest" });
  `);
  await parkMouse(driver);
  await sleep(400);
}

async function hideContentAfterSetTable(driver) {
  const removed = await driver.executeScript(`
    const preview = document.querySelector(".markdown-preview-view")
      || document.querySelector(".markdown-reading-view");
    if (!preview) return 0;
    const table = preview.querySelector("table");
    if (!table) return 0;
    let count = 0;
    let node = table.nextElementSibling;
    while (node) {
      const next = node.nextElementSibling;
      node.remove();
      count += 1;
      node = next;
    }
    return count;
  `);
  if (typeof removed !== "number") {
    throw new Error("could not hide content after the gym set table");
  }
}

async function captureNamed(driver, name) {
  await driver.executeScript(
    `document.querySelectorAll(".notice, .tooltip").forEach((el) => el.remove())`,
  );
  const dest = join(SHOT_DIR, `${name}.png`);
  mkdirSync(SHOT_DIR, { recursive: true });
  await capturePreviewCrop(driver, dest);
  trimShotWhitespace(dest);
  return dest;
}

function composeGymHero(desktopPath, mobilePath) {
  const framedDesktop = join(SHOT_DIR, "gym-framed-desktop.png");
  const framedMobile = join(SHOT_DIR, "gym-framed-phone.png");
  const paddedDesktop = join(SHOT_DIR, "gym-padded-desktop.png");
  const paddedMobile = join(SHOT_DIR, "gym-padded-phone.png");
  padHeroContent({
    scene: "daily",
    kind: "desktop",
    content: desktopPath,
    out: paddedDesktop,
  });
  padHeroContent({
    scene: "daily",
    kind: "phone",
    content: mobilePath,
    out: paddedMobile,
  });
  frameHeroContent({
    scene: "daily",
    kind: "desktop",
    content: paddedDesktop,
    out: framedDesktop,
  });
  frameHeroContent({
    scene: "daily",
    kind: "phone",
    content: paddedMobile,
    out: framedMobile,
  });
  return composeDeviceHero({
    desktop: framedDesktop,
    mobile: framedMobile,
    out: HERO_OUT,
    headline: GYM_HERO_HEADLINE,
    preframed: true,
  });
}

function publishStills(paths) {
  for (const dir of [REVIEW_DIR, WALKTHROUGH_DIR, ARTIFACT_DIR]) {
    mkdirSync(dir, { recursive: true });
  }
  for (const [name, src] of Object.entries(paths)) {
    if (!src || !existsSync(src)) continue;
    copyFileSync(src, join(REVIEW_DIR, `${name}.png`));
    copyFileSync(src, join(WALKTHROUGH_DIR, `${name}.png`));
  }
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) throw new Error(`Cannot capture gym hero: ${skip}`);
  const built = ensureDocsBundle(["atomic-gym-log", "atomic-timer", "atomic-cue-log"]);
  try {
    runSeed();
    writeGymHeroNote({ includeCues: true });
    installCaptureTheme();
    patchCaptureAppearance();
    const launched = await launchObsidian(VAULT, GYM_NOTE);
    const driver = await attachSelenium(undefined, launched.version);
    try {
      await switchToObsidianWindow(driver);
      await waitForPlugin(driver);
      await dismissTrustDialog(driver);
      await resizeWindow(driver, DESKTOP.width, DESKTOP.height);
      await openGymNote(driver, { waitForCues: true });
      const desktop = await captureNamed(driver, "gym_hero_desktop");
      writeGymHeroNote({ includeCues: false });
      await resizeWindow(driver, MOBILE.width, MOBILE.height);
      await openGymNote(driver, { waitForCues: false });
      await hideContentAfterSetTable(driver);
      const mobile = await captureNamed(driver, "gym_hero_mobile");
      const hero = composeGymHero(desktop, mobile);
      publishStills({
        gym_hero_desktop: desktop,
        gym_hero_mobile: mobile,
        atomic_gym_hero: hero,
      });
      console.log(`Saved ${hero}`);
      console.log(`Review stills: ${REVIEW_DIR}`);
    } finally {
      await stopSession({ driver });
    }
  } finally {
    restoreBundledMain(built);
  }
}

await main();
