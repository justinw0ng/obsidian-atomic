/**
 * Recapture USER_GUIDE clips as looping GIFs (original demo covers, no publisher art).
 *
 * Run: node scripts/capture-user-guide-screenshots.mjs
 * Optional: ATOMIC_DOCS_SHOTS=dashboard (comma-separated shot names, or `all`).
 * Dashboard still writes docs/images/atomic-dashboard.png and composes
 * docs/images/atomic-dashboard-hero.png in the shared desktop + phone chrome.
 * Optional: ATOMIC_CUE_POPUP_STILLS=/path/to/png-dir to rebuild atomic-cue-popup.gif.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ARTIFACT_DIR,
  attachSelenium,
  closeSettings,
  e2eSkipReason,
  fillPrompt,
  launchObsidian,
  openAtomicSettings,
  saveScreenshot,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForNotice,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";
import {
  composeDeviceHero,
  ensureDocsBundle,
  hideCaptureScrollbars,
  hideNoteProperties,
  showNoteProperties,
  openPreviewNote,
  parkMouse,
  resizeWindow,
  restoreBundledMain,
} from "./docs-capture.mjs";
import {
  assembleCuePopupPreviewGif,
  assembleGif,
  grabFrame,
  grabHold,
  frameDir,
} from "./docs-gif.mjs";
import {
  OPEN_COVER_TITLE,
  prepareUserGuideVault,
  TIMER_ITEM_TITLE,
  USER_GUIDE_VAULT,
} from "./prepare-user-guide-vault.mjs";
import { capturePreviewCrop, frameHeroContent } from "./hero-frames.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = join(ROOT, "docs/images");

const FILES = {
  bookShelf: "atomics/hobbies/Reading/Book Shelf.md",
  timerItem: `atomics/hobbies/Reading/Items/${TIMER_ITEM_TITLE}.md`,
  gymSession: "atomics/exercise/Gym/2026/2026-08-11.md",
  golfToday: "atomics/exercise/Golf/2026/2026-08-11.md",
  golfCues: "atomics/exercise/Golf/Cues.md",
  dashboard: "atomics/Dashboard.md",
  heatmap: "atomics/Heatmap.md",
  heatmapReading: "atomics/Heatmap reading.md",
  heatmapExercise: "atomics/Heatmap gym golf.md",
  today: "atomics/Today.md",
  daily: "Daily notes/2026-08-11.md",
};

const OUTPUTS = {
  bookShelf: "atomic-book-shelf.gif",
  timer: "atomic-reading-timer.gif",
  sessionTimer: "atomic-session-timer.gif",
  gymLog: "atomic-gym-log.gif",
  dashboard: "atomic-dashboard.gif",
  dashboardStill: "atomic-dashboard.png",
  dashboardHero: "atomic-dashboard-hero.png",
  settings: "07-settings-atomic.gif",
  enable: "06-enable-atomic-plugin.gif",
  heatmap: "atomic-heatmap.gif",
  heatmapFilter: "atomic-heatmap-activity-filter.gif",
  actions: "atomic-actions.gif",
  today: "atomic-today.gif",
  cues: "atomic-cues-hover.gif",
  cueLog: "atomic-cue-log.gif",
  cuePopup: "atomic-cue-popup.gif",
  properties: "atomic-property-select.gif",
};

const DASHBOARD_DESKTOP = { width: 1920, height: 1400 };
/** Wide enough for 2-column KPIs (minmax 170px) so the phone frame shows more UI. */
const DASHBOARD_MOBILE = { width: 480, height: 1040 };
const DASHBOARD_HERO_HEADLINE = "Your year. One dashboard.";

const REQUESTED_SHOTS = new Set(
  (process.env.ATOMIC_DOCS_SHOTS || "all")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

function wantShot(name) {
  return REQUESTED_SHOTS.has("all") || REQUESTED_SHOTS.has(name);
}

async function waitForCoverImages(driver, min = 12, timeoutMs = 30000) {
  const start = Date.now();
  let last = 0;
  while (Date.now() - start < timeoutMs) {
    last = await driver.executeScript(`
      return [...document.querySelectorAll("img.atomic-book-cover")]
        .filter((img) => img.complete && img.naturalWidth > 40).length;
    `);
    if (last >= min) return last;
    await sleep(400);
  }
  throw new Error(`Cover images not ready (loaded ${last}, need ${min})`);
}

async function openCover(driver, title) {
  const result = await driver.executeScript(
    `
    const title = arguments[0];
    const books = [...document.querySelectorAll('[data-testid="atomic-book"][data-title="' + title + '"]')];
    const visible = books.find((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 20 && rect.height > 20;
    });
    const book = visible || books[0];
    if (!book) return { ok: false, error: "missing book", count: books.length };
    book.scrollIntoView({ block: "center", inline: "nearest" });
    book.classList.add("is-cover-open");
    const face = book.querySelector(".atomic-book-face");
    for (const el of [book, face]) {
      if (!el) continue;
      el.style.setProperty("transition", "none", "important");
    }
    return { ok: true, open: book.classList.contains("is-cover-open"), title: book.getAttribute("data-title") };
    `,
    title,
  );
  if (!result?.ok) {
    throw new Error(`Could not open cover for ${title}: ${JSON.stringify(result)}`);
  }
  await sleep(200);
}

async function prepareGuideView(driver) {
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
}

function composeDashboardHero(desktopPath, mobilePath) {
  const framedDir = "/tmp/atomic-dashboard-hero-frames";
  mkdirSync(framedDir, { recursive: true });
  const framedDesktop = join(framedDir, "desktop.png");
  const framedMobile = join(framedDir, "phone.png");
  frameHeroContent({
    scene: "dashboard",
    kind: "desktop",
    content: desktopPath,
    out: framedDesktop,
  });
  frameHeroContent({
    scene: "dashboard",
    kind: "phone",
    content: mobilePath,
    out: framedMobile,
  });
  return composeDeviceHero({
    desktop: framedDesktop,
    mobile: framedMobile,
    out: join(IMAGES, OUTPUTS.dashboardHero),
    headline: DASHBOARD_HERO_HEADLINE,
    preframed: true,
  });
}

async function captureStill(driver, name, destName) {
  await driver.executeScript(
    `document.querySelectorAll(".tooltip").forEach((el) => el.remove());`,
  );
  const src = await saveScreenshot(driver, name);
  const dest = join(IMAGES, destName);
  copyFileSync(src, dest);
  if (!existsSync(dest)) throw new Error(`Failed to write ${dest}`);
  console.log(`Wrote ${dest}`);
  return dest;
}

async function captureFullPageProof(driver, css, name, width) {
  mkdirSync(ARTIFACT_DIR, { recursive: true });
  try {
    const size = await driver.executeScript(
      `
      const el = [...document.querySelectorAll(arguments[0])].find((node) => {
        const rect = node.getBoundingClientRect();
        return rect.width > 20 && rect.height > 20;
      });
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        width: Math.ceil(rect.width),
        height: Math.ceil(Math.max(el.scrollHeight || 0, rect.height)),
      };
      `,
      css,
    );
    if (!size || size.width < 10 || size.height < 10) {
      console.warn(`Skip full-page ${name}: element not measurable (${JSON.stringify(size)})`);
      return null;
    }
    const chrome = 160;
    await resizeWindow(driver, width, Math.min(size.height + chrome, 4000));
    await parkMouse(driver);
    await sleep(400);
    const src = await saveScreenshot(driver, name);
    console.log(`Wrote proof ${src}`);
    return src;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Skip full-page ${name}: ${message}`);
    return null;
  }
}

async function openCommunityPlugins(driver) {
  await driver.executeScript(`
    if (app.setting.shouldUsePopout) {
      app.setting.shouldUsePopout = () => false;
    }
    app.setting.open();
    app.setting.openTabById("community-plugins");
  `);
  await waitCss(driver, ".vertical-tab-nav-item", 8000);
  const opened = await driver.executeScript(`
    const items = Array.from(document.querySelectorAll(".vertical-tab-nav-item"));
    const tab = items.find((el) => /community plugins/i.test(el.textContent || ""));
    if (tab) tab.click();
    if (app.setting && app.setting.openTabById) {
      app.setting.openTabById("community-plugins");
    }
    return /community plugins/i.test(document.body.innerText || "");
  `);
  if (!opened) throw new Error("Could not open Community plugins settings");
  await sleep(500);
}

async function scrollBlockIntoView(driver, css) {
  await driver.executeScript(
    `
    const el = document.querySelector(arguments[0]);
    el?.scrollIntoView({ block: "center", inline: "nearest" });
    `,
    css,
  );
  await sleep(200);
}

/** The good reading-timer frame is the short window: title, properties, timer card. */
const READING_TIMER_WINDOW = { width: 1920, height: 782 };

async function focusReadingTimerCard(driver) {
  await showNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await driver.executeScript(`
    const timer = document.querySelector('[data-testid="atomic-timer"]');
    if (!timer) return;
    const root = timer.closest(".markdown-preview-sizer, .cm-content, .cm-editor") || document.body;
    const nodes = root.querySelectorAll(".cm-line, .el-p, .el-ul, .el-h1, .el-h2, .el-h3, h1, h2, h3, ul, ol, p");
    let hide = false;
    for (const el of nodes) {
      if (el.contains(timer) || timer.contains(el)) break;
      const text = (el.innerText || "").trim();
      if (/^(remarks|time log)$/i.test(text)) hide = true;
      if (hide) el.style.setProperty("display", "none", "important");
    }
    const scroller = timer.closest(".cm-scroller, .markdown-preview-view, .view-content");
    if (!scroller) {
      timer.scrollIntoView({ block: "center", inline: "nearest" });
      return;
    }
    const rect = timer.getBoundingClientRect();
    const bounds = scroller.getBoundingClientRect();
    if (rect.top < bounds.top || rect.bottom > bounds.bottom) {
      timer.scrollIntoView({ block: "center", inline: "nearest" });
    }
  `);
  await sleep(200);
}

async function fillTestId(driver, testId, value) {
  const ok = await driver.executeScript(
    `
    const el = document.querySelector('[data-testid="' + arguments[0] + '"]');
    if (!el) return false;
    el.focus();
    el.value = arguments[1];
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
    `,
    testId,
    value,
  );
  if (!ok) throw new Error(`Could not fill ${testId}`);
}

async function popCueCard(driver, preferIndex = 1) {
  const index = await driver.executeScript(
    `
    const cards = [...document.querySelectorAll('[data-testid="atomic-cue-card"]')];
    const visible = cards
      .map((card, i) => ({ i, width: card.getBoundingClientRect().width }))
      .filter((card) => card.width > 40);
    if (!visible.length) return -1;
    return visible[Math.min(arguments[0], visible.length - 1)].i;
    `,
    preferIndex,
  );
  if (index < 0) throw new Error("no visible cue card");
  await driver.executeScript(
    `
    const cards = [...document.querySelectorAll('[data-testid="atomic-cue-card"]')];
    const card = cards[arguments[0]];
    for (const other of cards) other.classList.remove("is-open");
    card.classList.add("is-open");
    card.scrollIntoView({ block: "center", inline: "nearest" });
    `,
    index,
  );
  return index;
}

async function captureBookShelfGif(driver) {
  await openPreviewNote(driver, FILES.bookShelf);
  await waitCss(driver, '[data-testid="atomic-bookshelf"]');
  await waitForCoverImages(driver, 12);
  await prepareGuideView(driver);
  await sleep(700);
  const dir = frameDir("book-shelf");
  await grabHold(driver, dir, 0, 2, 200);
  await openCover(driver, OPEN_COVER_TITLE);
  await grabHold(driver, dir, 2, 3, 180);
  assembleGif(dir, OUTPUTS.bookShelf, { durationMs: 280, holdFirst: 1, holdLast: 2 });
}

function stageReadingTimerDemo() {
  const path = join(USER_GUIDE_VAULT, FILES.timerItem);
  let markdown = readFileSync(path, "utf8");
  const startedAt = new Date(Date.now() - (12 * 60 + 48) * 1000).toISOString();
  const next = markdown
    .replace(/^total_min:.*$/m, "total_min: 40")
    .replace(/^timer_started_at:.*$/m, `timer_started_at: "${startedAt}"`)
    .replace(/## Time log\n\n[\s\S]*?(?=```atomic-timer)/, "## Time log\n\n- 2026-08-11 | 40 min\n\n");
  if (next === markdown || !next.includes("total_min: 40") || !next.includes(startedAt)) {
    throw new Error("Could not stage the reading timer demo clock");
  }
  writeFileSync(path, next);
}

async function captureReadingTimerGif(driver) {
  stageReadingTimerDemo();
  await resizeWindow(driver, READING_TIMER_WINDOW.width, READING_TIMER_WINDOW.height);
  await openPreviewNote(driver, FILES.timerItem);
  await waitCss(driver, '[data-testid="atomic-timer-stop"]');
  await focusReadingTimerCard(driver);
  await parkMouse(driver);
  const dir = frameDir("reading-timer");
  await grabHold(driver, dir, 0, 2, 220);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-timer-stop"]').click()`,
  );
  await fillPrompt(driver, "ch.3 — field notes");
  await waitForNotice(driver, "Logged");
  await waitCss(driver, '[data-testid="atomic-timer-start"]');
  await focusReadingTimerCard(driver);
  await parkMouse(driver);
  await grabHold(driver, dir, 2, 2, 200);
  assembleGif(dir, OUTPUTS.timer, { durationMs: 420, holdFirst: 1, holdLast: 2 });
  await resizeWindow(driver, 1920, 1200);
}

async function captureSessionTimerGif(driver) {
  await openPreviewNote(driver, FILES.gymSession);
  await waitCss(driver, '[data-testid="atomic-timer"]');
  await prepareGuideView(driver);
  const dir = frameDir("session-timer");
  const startReady = await driver.executeScript(
    `return !!document.querySelector('[data-testid="atomic-timer-start"]')`,
  );
  if (startReady) {
    await grabFrame(driver, dir, 0);
    await driver.executeScript(
      `document.querySelector('[data-testid="atomic-timer-start"]').click()`,
    );
    await waitCss(driver, '[data-testid="atomic-timer-stop"]');
    await prepareGuideView(driver);
    await grabHold(driver, dir, 1, 2, 180);
    await driver.executeScript(
      `document.querySelector('[data-testid="atomic-timer-stop"]').click()`,
    );
    await waitCss(driver, '[data-testid="atomic-timer-start"]');
    await prepareGuideView(driver);
    await grabHold(driver, dir, 3, 2, 180);
  } else {
    await grabHold(driver, dir, 0, 3, 200);
  }
  assembleGif(dir, OUTPUTS.sessionTimer, { durationMs: 360, holdFirst: 1, holdLast: 2 });
}

async function captureGymLogGif(driver) {
  await openPreviewNote(driver, FILES.gymSession);
  await waitCss(driver, '[data-testid="atomic-gym-log-add"]');
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-gym-log"]');
  const dir = frameDir("gym-log");
  await grabFrame(driver, dir, 0);
  await fillTestId(driver, "atomic-gym-log-weight", "85");
  await grabFrame(driver, dir, 1);
  await fillTestId(driver, "atomic-gym-log-reps", "5");
  await fillTestId(driver, "atomic-gym-log-notes", "guide set");
  await grabFrame(driver, dir, 2);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-gym-log-add"]').click()`,
  );
  await waitForNotice(driver, "Logged");
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-gym-log"]');
  await grabHold(driver, dir, 3, 2, 200);
  assembleGif(dir, OUTPUTS.gymLog, { durationMs: 320, holdFirst: 1, holdLast: 2 });
}

async function captureDashboardGif(driver) {
  await resizeWindow(driver, DASHBOARD_DESKTOP.width, DASHBOARD_DESKTOP.height);
  await openPreviewNote(driver, FILES.dashboard);
  await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  await sleep(500);
  await captureStill(driver, "user-guide-dashboard", OUTPUTS.dashboardStill);
  const dir = frameDir("dashboard");
  await grabFrame(driver, dir, 0);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-dashboard-year-next"]')?.click()`,
  );
  await sleep(400);
  await hideCaptureScrollbars(driver);
  await grabFrame(driver, dir, 1);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-dashboard-year-prev"]')?.click()`,
  );
  await sleep(400);
  await hideCaptureScrollbars(driver);
  await grabHold(driver, dir, 2, 2, 180);
  assembleGif(dir, OUTPUTS.dashboard, { durationMs: 500, holdFirst: 1, holdLast: 2 });

  await captureFullPageProof(
    driver,
    '[data-testid="atomic-dashboard"]',
    "dashboard-desktop-fullpage",
    DASHBOARD_DESKTOP.width,
  );

  const desktopPreview = join("/tmp/atomic-dashboard-hero-frames", "desktop-content.png");
  await capturePreviewCrop(driver, desktopPreview);
  await resizeWindow(driver, DASHBOARD_MOBILE.width, DASHBOARD_MOBILE.height);
  await openPreviewNote(driver, FILES.dashboard);
  await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  await sleep(600);
  await driver.executeScript(
    `document.querySelectorAll(".tooltip").forEach((el) => el.remove());`,
  );
  const mobilePreview = join("/tmp/atomic-dashboard-hero-frames", "phone-content.png");
  await capturePreviewCrop(driver, mobilePreview);
  await composeDashboardHero(desktopPreview, mobilePreview);
  await captureFullPageProof(
    driver,
    '[data-testid="atomic-dashboard"]',
    "dashboard-mobile-fullpage",
    DASHBOARD_MOBILE.width,
  );
  await resizeWindow(driver, 1920, 1200);
}

async function recaptureDashboardHero(driver) {
  await resizeWindow(driver, DASHBOARD_DESKTOP.width, DASHBOARD_DESKTOP.height);
  await openPreviewNote(driver, FILES.dashboard);
  await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  await sleep(500);
  const desktopPreview = join("/tmp/atomic-dashboard-hero-frames", "desktop-content.png");
  await capturePreviewCrop(driver, desktopPreview);
  await resizeWindow(driver, DASHBOARD_MOBILE.width, DASHBOARD_MOBILE.height);
  await openPreviewNote(driver, FILES.dashboard);
  await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  await sleep(600);
  const mobilePreview = join("/tmp/atomic-dashboard-hero-frames", "phone-content.png");
  await capturePreviewCrop(driver, mobilePreview);
  await composeDashboardHero(desktopPreview, mobilePreview);
  await resizeWindow(driver, 1920, 1200);
}

async function captureHeatmapGif(driver) {
  await openPreviewNote(driver, FILES.heatmap);
  await waitCss(driver, '[data-testid="atomic-heatmap"]');
  await prepareGuideView(driver);
  await sleep(400);
  const dir = frameDir("heatmap");
  await grabHold(driver, dir, 0, 2, 200);
  await driver.executeScript(`
    const cell = document.querySelector('[data-testid="atomic-heatmap-today"]');
    if (cell) {
      cell.scrollIntoView({ block: "center", inline: "nearest" });
      cell.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    }
  `);
  await sleep(250);
  await grabHold(driver, dir, 2, 2, 180);
  assembleGif(dir, OUTPUTS.heatmap, { durationMs: 360, holdFirst: 1, holdLast: 2 });
}

async function captureHeatmapFilterGif(driver) {
  const dir = frameDir("heatmap-filter");
  await openPreviewNote(driver, FILES.heatmapReading);
  await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="reading"]');
  await prepareGuideView(driver);
  await grabHold(driver, dir, 0, 2, 180);
  await openPreviewNote(driver, FILES.heatmapExercise);
  await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="gym"]');
  await prepareGuideView(driver);
  await grabHold(driver, dir, 2, 2, 180);
  await openPreviewNote(driver, FILES.heatmap);
  await waitCss(driver, '[data-testid="atomic-heatmap"][data-activity="reading"]');
  await prepareGuideView(driver);
  await grabHold(driver, dir, 4, 2, 180);
  assembleGif(dir, OUTPUTS.heatmapFilter, { durationMs: 700, holdFirst: 0, holdLast: 1 });
}

async function captureActionsGif(driver) {
  await openPreviewNote(driver, FILES.daily);
  await waitCss(driver, ".fitness-actions");
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, ".fitness-actions");
  const dir = frameDir("actions");
  await grabHold(driver, dir, 0, 2, 200);
  await driver.executeScript(`
    const button = document.querySelector(".fitness-actions button");
    button?.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
  `);
  await grabHold(driver, dir, 2, 2, 180);
  assembleGif(dir, OUTPUTS.actions, { durationMs: 320, holdFirst: 1, holdLast: 2 });
}

async function captureTodayGif(driver) {
  await resizeWindow(driver, 1920, 653);
  await openPreviewNote(driver, FILES.today);
  await waitCss(driver, '[data-testid="atomic-today-row"]');
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-today"]');
  const dir = frameDir("today");
  await grabHold(driver, dir, 0, 2, 200);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-today-row"]')?.click()`,
  );
  await waitCss(driver, '[data-testid="atomic-timer"], [data-testid="atomic-gym-log"]');
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-timer"], [data-testid="atomic-gym-log"]');
  await grabHold(driver, dir, 2, 2, 200);
  assembleGif(dir, OUTPUTS.today, { durationMs: 500, holdFirst: 1, holdLast: 2 });
  await resizeWindow(driver, 1920, 1200);
}

async function captureCuesHoverGif(driver) {
  await openPreviewNote(driver, FILES.golfCues);
  await waitCss(driver, '[data-testid="atomic-cues"]');
  await driver.wait(async () => {
    const count = await driver.executeScript(
      `return document.querySelectorAll('[data-testid="atomic-cue-card"]').length`,
    );
    return count >= 4;
  }, 20000);
  await prepareGuideView(driver);
  await hideCaptureScrollbars(driver, `
    .fitness-plugin .atomic-cue-fan {
      justify-content: center;
      justify-items: center;
      overflow: visible !important;
    }
  `);
  const dir = frameDir("cues-hover");
  await grabHold(driver, dir, 0, 2, 160);
  await popCueCard(driver, 1);
  for (let i = 0; i < 4; i += 1) {
    await sleep(90);
    await grabFrame(driver, dir, 2 + i);
  }
  await sleep(200);
  await grabHold(driver, dir, 6, 2, 180);
  assembleGif(dir, OUTPUTS.cues, { durationMs: 140, holdFirst: 2, holdLast: 3 });
}

async function captureCuePopupGif(driver) {
  if ((process.env.ATOMIC_CUE_POPUP_STILLS || "").trim()) return;
  await openPreviewNote(driver, FILES.golfCues);
  await waitCss(driver, '[data-testid="atomic-cues"]');
  await driver.wait(async () => {
    const count = await driver.executeScript(
      `return document.querySelectorAll('[data-testid="atomic-cue-card"]').length`,
    );
    return count >= 4;
  }, 20000);
  await prepareGuideView(driver);
  await hideCaptureScrollbars(driver);
  const dir = frameDir("cue-popup");
  await grabFrame(driver, dir, 0);
  await popCueCard(driver, 1);
  await sleep(220);
  await grabFrame(driver, dir, 1);
  await driver.executeScript(`
    const cards = [...document.querySelectorAll('[data-testid="atomic-cue-card"]')];
    const visible = cards.filter((card) => card.getBoundingClientRect().width > 40);
    const card = visible[Math.min(1, visible.length - 1)] || cards[0];
    card?.click();
  `);
  await driver.wait(async () => {
    return driver.executeScript(`
      const overlay = document.querySelector('[data-testid="atomic-cue-lightbox"]');
      return !!overlay?.classList.contains("is-placed");
    `);
  }, 8000);
  await sleep(280);
  await grabHold(driver, dir, 2, 2, 180);
  assembleGif(dir, OUTPUTS.cuePopup, { durationMs: 420, holdFirst: 1, holdLast: 2 });
  await driver.executeScript(`
    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
  `);
}

async function waitForSessionPropertySelects(driver) {
  let last = null;
  try {
    await driver.wait(async () => {
      last = await driver.executeScript(`
        const props = [...document.querySelectorAll(".metadata-property")].map((el) => {
          const key = el.querySelector(".metadata-property-key-input");
          return (key?.value || key?.textContent || "").trim();
        });
        const box = document.querySelector(".metadata-container");
        return {
          path: app.workspace.getActiveFile()?.path || "",
          props,
          selects: [...document.querySelectorAll("select.atomic-property-select")].map((el) => el.getAttribute("data-property")),
          display: box ? getComputedStyle(box).display : "missing",
          config: app.vault.getConfig?.("propertiesInDocument") || "",
        };
      `);
      return last.selects.includes("location") && last.selects.includes("weight_unit");
    }, 12000);
  } catch (error) {
    throw new Error(`Session property selects did not appear (${error.message}) last=${JSON.stringify(last)}`);
  }
}

async function capturePropertySelectGif(driver) {
  await resizeWindow(driver, 980, 720);
  await showNoteProperties(driver);
  const resetUnit = await driver.executeAsyncScript(`
    const path = arguments[0];
    const done = arguments[arguments.length - 1];
    const file = app.vault.getAbstractFileByPath(path);
    if (!file) {
      done("missing gym session");
      return;
    }
    app.fileManager.processFrontMatter(file, (fm) => {
      fm.weight_unit = "kg";
    }).then(() => done("ok"), (err) => done(String(err)));
  `, FILES.gymSession);
  if (resetUnit !== "ok") {
    throw new Error(`Could not reset weight unit: ${resetUnit}`);
  }
  await openPreviewNote(driver, FILES.gymSession);
  await showNoteProperties(driver);
  await waitForSessionPropertySelects(driver);
  await scrollBlockIntoView(driver, ".metadata-properties");
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  const dir = frameDir("property-select");
  await grabHold(driver, dir, 0, 2, 180);
  await driver.executeScript(`
    const select = document.querySelector(
      'select[data-testid="atomic-property-select"][data-property="weight_unit"]'
    );
    if (!select) return;
    select.value = "lb";
    select.dispatchEvent(new Event("change", { bubbles: true }));
  `);
  await driver.wait(async () => {
    const value = await driver.executeScript(`
      return document.querySelector(
        'select[data-testid="atomic-property-select"][data-property="weight_unit"]'
      )?.value || "";
    `);
    return value === "lb";
  }, 8000);
  await hideCaptureScrollbars(driver);
  await parkMouse(driver);
  await scrollBlockIntoView(driver, ".metadata-properties");
  await grabHold(driver, dir, 2, 2, 200);
  assembleGif(dir, OUTPUTS.properties, { durationMs: 420, holdFirst: 1, holdLast: 2 });
  await resizeWindow(driver, 1920, 1200);
}

async function captureCueLogGif(driver) {
  await openPreviewNote(driver, FILES.golfToday);
  await waitCss(driver, '[data-testid="atomic-cue-log-add"]');
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-cue-log"]');
  const dir = frameDir("cue-log");
  await grabFrame(driver, dir, 0);
  await fillTestId(driver, "atomic-cue-log-text", "Hold the face square through the ball");
  await grabFrame(driver, dir, 1);
  await driver.executeScript(
    `document.querySelector('[data-testid="atomic-cue-log-add"]').click()`,
  );
  await waitForNotice(driver, "cue");
  await prepareGuideView(driver);
  await scrollBlockIntoView(driver, '[data-testid="atomic-cue-log"]');
  await grabHold(driver, dir, 2, 2, 200);
  assembleGif(dir, OUTPUTS.cueLog, { durationMs: 360, holdFirst: 1, holdLast: 2 });
}

async function captureSettingsGif(driver) {
  await openPreviewNote(driver, FILES.bookShelf);
  await waitCss(driver, '[data-testid="atomic-bookshelf"]');
  await openAtomicSettings(driver);
  await waitCss(driver, '[data-testid="atomic-setting-activity"]');
  const dir = frameDir("settings");
  await driver.executeScript(`
    const heading = Array.from(document.querySelectorAll(".setting-item-heading, .setting-item-name"))
      .find((el) => /exercise types/i.test(el.textContent || ""));
    heading?.scrollIntoView({ block: "start" });
  `);
  await sleep(300);
  await grabFrame(driver, dir, 0);
  await driver.executeScript(`
    const hobbies = Array.from(document.querySelectorAll(".setting-item-heading, .setting-item-name"))
      .find((el) => /general habits/i.test(el.textContent || ""));
    hobbies?.scrollIntoView({ block: "start" });
  `);
  await sleep(300);
  await grabHold(driver, dir, 1, 2, 200);
  assembleGif(dir, OUTPUTS.settings, { durationMs: 500, holdFirst: 1, holdLast: 2 });
  await closeSettings(driver);
}

async function captureEnableGif(driver) {
  await resizeWindow(driver, 1280, 800);
  await openPreviewNote(driver, FILES.timerItem);
  await waitCss(driver, '[data-testid="atomic-timer"]');
  await openCommunityPlugins(driver);
  await sleep(500);
  const dir = frameDir("enable");
  await grabHold(driver, dir, 0, 3, 220);
  assembleGif(dir, OUTPUTS.enable, { durationMs: 400, holdFirst: 1, holdLast: 2 });
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) {
    throw new Error(`Cannot capture screenshots: ${skip}`);
  }

  if (wantShot("cuePopup")) assembleCuePopupPreviewGif();

  const built = ensureDocsBundle(["atomic-dashboard-recent", "atomic-cue-log"]);
  try {
    prepareUserGuideVault();
    const launchFile = wantShot("bookShelf") ? FILES.bookShelf : FILES.dashboard;
    const launched = await launchObsidian(USER_GUIDE_VAULT, launchFile);
    const driver = await attachSelenium(undefined, launched.version);
    try {
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
    await resizeWindow(driver, 1920, 1200);

    const shots = [
      ["bookShelf", captureBookShelfGif],
      ["heatmap", captureHeatmapGif],
      ["heatmapFilter", captureHeatmapFilterGif],
      ["actions", captureActionsGif],
      ["today", captureTodayGif],
      ["cues", captureCuesHoverGif],
      ["cuePopup", captureCuePopupGif],
      ["cueLog", captureCueLogGif],
      ["properties", capturePropertySelectGif],
      ["timer", captureReadingTimerGif],
      ["sessionTimer", captureSessionTimerGif],
      ["gymLog", captureGymLogGif],
      ["dashboard", captureDashboardGif],
      ["dashboardHero", recaptureDashboardHero],
      ["settings", captureSettingsGif],
      ["enable", captureEnableGif],
    ];
    const failures = [];
    for (const [name, run] of shots) {
      if (!wantShot(name)) continue;
      try {
        await run(driver);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`Shot ${name} failed: ${message}`);
        failures.push(`${name}: ${message}`);
        try {
          await closeSettings(driver);
        } catch {
          // Settings may already be closed.
        }
        await resizeWindow(driver, 1920, 1200);
      }
    }
    if (failures.length) {
      throw new Error(`Some user-guide shots failed:\n${failures.join("\n")}`);
    }
  } finally {
    await stopSession({ driver });
  }
  } finally {
    restoreBundledMain(built);
  }
}

await main();
