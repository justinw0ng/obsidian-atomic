/**
 * Recapture USER_GUIDE screenshots with original demo covers (no publisher art).
 *
 * Run: node scripts/capture-user-guide-screenshots.mjs
 * Optional: ATOMIC_DOCS_SHOTS=dashboard (comma-separated: bookShelf,timer,gymLog,dashboard,settings,enable)
 * Dashboard shots also compose docs/images/atomic-dashboard-hero.png via compose-device-hero.py.
 * Optional: ATOMIC_DASHBOARD_PHONE_SRC=/path/to/phone.jpg to use a real phone screenshot
 * in the hero device frame (trims status bar / home indicator).
 */
import { spawn, spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Key } from "selenium-webdriver";
import { E2E_VAULT_ID, registerVaultInObsidianConfig } from "../e2e/lib/vault.mjs";
import {
  ARTIFACT_DIR,
  attachSelenium,
  closeSettings,
  DEBUG_PORT,
  DEFAULT_DISPLAY,
  e2eSkipReason,
  findObsidianBinary,
  openAtomicSettings,
  openVaultFile,
  resolveDisplay,
  saveScreenshot,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForCdp,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";
import {
  OPEN_COVER_TITLE,
  prepareUserGuideVault,
  TIMER_ITEM_TITLE,
  USER_GUIDE_VAULT,
} from "./prepare-user-guide-vault.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const IMAGES = join(ROOT, "docs/images");

const FILES = {
  bookShelf: "atomics/hobbies/Reading/Book Shelf.md",
  timerItem: `atomics/hobbies/Reading/Items/${TIMER_ITEM_TITLE}.md`,
  gymSession: "atomics/exercise/Gym/2026/2026-08-11.md",
  dashboard: "atomics/Dashboard.md",
};

const OUTPUTS = {
  bookShelf: "atomic-book-shelf.png",
  bookShelfOpen: "atomic-book-shelf-open.png",
  timer: "atomic-reading-timer.png",
  gymLog: "atomic-gym-log.png",
  dashboard: "atomic-dashboard.png",
  dashboardHero: "atomic-dashboard-hero.png",
  settings: "07-settings-atomic.png",
  enable: "06-enable-atomic-plugin.png",
};

const DASHBOARD_DESKTOP = { width: 1920, height: 1400 };
/** Wide enough for 2-column KPIs (minmax 170px) so the phone frame shows more UI. */
const DASHBOARD_MOBILE = { width: 480, height: 1040 };
const DASHBOARD_HERO_HEADLINE = "Your year. One dashboard.";
const DASHBOARD_PHONE_SRC = (process.env.ATOMIC_DASHBOARD_PHONE_SRC || "").trim();

/** Comma-separated shot names, or `all`. Example: ATOMIC_DOCS_SHOTS=dashboard */
const REQUESTED_SHOTS = new Set(
  (process.env.ATOMIC_DOCS_SHOTS || "all")
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean),
);

function wantShot(name) {
  return REQUESTED_SHOTS.has("all") || REQUESTED_SHOTS.has(name);
}

function assertDashboardBundle() {
  const bundle = readFileSync(join(ROOT, "main.js"), "utf8");
  if (!bundle.includes("atomic-dashboard-recent")) {
    throw new Error(
      "main.js is missing the card dashboard. Run `npm run build`, recapture, then `git checkout -- main.js` if you are not shipping a release.",
    );
  }
}

async function collapseSidebars(driver) {
  await driver.executeScript(`
    app.workspace.leftSplit?.collapse?.();
    app.workspace.rightSplit?.collapse?.();
  `);
}

async function showPreview(driver) {
  await driver.executeAsyncScript(`
    const done = arguments[0];
    const leaf = app.workspace.getMostRecentLeaf();
    if (!leaf) {
      done(false);
      return;
    }
    const state = leaf.getViewState();
    state.state = state.state || {};
    state.state.mode = "preview";
    state.state.source = false;
    leaf.setViewState(state).then(() => done(true), () => done(false));
  `);
}

async function launchForCapture(vaultPath, filePath) {
  spawnSync("pkill", ["-9", "-f", "/opt/Obsidian/obsidian"], { stdio: "ignore" });
  spawnSync("pkill", ["-9", "-f", "/usr/bin/obsidian"], { stdio: "ignore" });
  await sleep(1000);
  const binary = findObsidianBinary();
  if (!binary) throw new Error("Obsidian binary not found");
  const vaultId = registerVaultInObsidianConfig(vaultPath, E2E_VAULT_ID);
  const uri = `obsidian://open?vault=${vaultId}&file=${encodeURIComponent(filePath)}`;
  const child = spawn(
    binary,
    [
      "--no-sandbox",
      "--disable-dev-shm-usage",
      `--remote-debugging-port=${DEBUG_PORT}`,
      "--remote-allow-origins=*",
      uri,
    ],
    {
      env: { ...process.env, DISPLAY: resolveDisplay() || DEFAULT_DISPLAY },
      detached: true,
      stdio: "ignore",
    },
  );
  child.unref();
  const version = await waitForCdp(DEBUG_PORT);
  return { child, version, vaultId };
}

function spawnXdotool(args) {
  const result = spawnSync("xdotool", args, { encoding: "utf8" });
  if (result.error?.code === "ENOENT") {
    return { missing: true, result };
  }
  return { missing: false, result };
}

function xdotoolResize(width, height) {
  const search = spawnXdotool(["search", "--name", "Obsidian"]);
  if (search.missing) return { missing: true };
  const ids = (search.result.stdout || "").trim().split("\n").filter(Boolean);
  for (const id of ids) {
    spawnXdotool(["windowmove", "--sync", id, "0", "0"]);
    spawnXdotool(["windowsize", "--sync", id, String(width), String(height)]);
    spawnXdotool(["windowactivate", "--sync", id]);
  }
  return { missing: false };
}

async function resizeWindow(driver, width, height) {
  let setRectOk = false;
  try {
    await driver.manage().window().setRect({ x: 0, y: 0, width, height });
    setRectOk = true;
  } catch {
    // Electron sometimes rejects setRect; xdotool is the fallback.
  }
  const xdo = xdotoolResize(width, height);
  if (xdo.missing && !setRectOk) {
    throw new Error(
      "Could not resize the Obsidian window. Electron rejected setRect and xdotool is not installed. Install xdotool (apt install xdotool) or allow window.setRect.",
    );
  }
  await sleep(400);
}

async function waitForCoverImages(driver, min = 12, timeoutMs = 30000) {
  const start = Date.now();
  let last = 0;
  while (Date.now() - start < timeoutMs) {
    last = await driver.executeScript(`
      return [...document.querySelectorAll(".atomic-book-cover-image")]
        .filter((img) => img.complete && img.naturalWidth > 40).length;
    `);
    if (last >= min) return last;
    await sleep(400);
  }
  throw new Error(`Cover images not ready (loaded ${last}, need ${min})`);
}

async function parkMouse(driver) {
  try {
    await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
    await driver.actions({ async: false }).move({ x: 12, y: 12, origin: "viewport" }).perform();
  } catch {
    // Mouse parking is best-effort.
  }
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
    const rect = book.getBoundingClientRect();
    book.scrollIntoView({ block: "center", inline: "nearest" });
    book.classList.add("is-cover-open");
    book.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    const cover = book.querySelector(".atomic-book-cover");
    const volume = book.querySelector(".atomic-book-volume");
    for (const el of [book, cover, volume]) {
      if (!el) continue;
      el.style.setProperty("transition", "none", "important");
    }
    if (cover) {
      // This VM flattens CSS 3D (rotateY → identity). Hide the face so the
      // page (title + author) shows, matching the documented cover-open hover.
      cover.style.setProperty("opacity", "0", "important");
    }
    book.style.setProperty("position", "relative", "important");
    book.style.setProperty("top", "-8px", "important");
    book.style.setProperty("z-index", "6", "important");
    return {
      ok: true,
      count: books.length,
      rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
      opacity: cover ? getComputedStyle(cover).opacity : "",
      title: book.getAttribute("data-title"),
    };
    `,
    title,
  );
  if (!result?.ok) {
    throw new Error(`Could not open cover for ${title}: ${JSON.stringify(result)}`);
  }
  await sleep(300);
  const again = await driver.executeScript(
    `
    const title = arguments[0];
    const books = [...document.querySelectorAll('[data-testid="atomic-book"][data-title="' + title + '"]')];
    const book = books.find((el) => el.getBoundingClientRect().width > 20);
    if (!book) return { ok: false };
    book.classList.add("is-cover-open");
    book.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    const cover = book.querySelector(".atomic-book-cover");
    if (cover) {
      cover.style.setProperty("transition", "none", "important");
      cover.style.setProperty("opacity", "0", "important");
    }
    book.style.setProperty("position", "relative", "important");
    book.style.setProperty("top", "-8px", "important");
    book.style.setProperty("z-index", "6", "important");
    return { ok: true, opacity: cover ? getComputedStyle(cover).opacity : "" };
    `,
    title,
  );
  if (!again?.ok || again.opacity !== "0") {
    throw new Error(`Cover did not stay open: ${JSON.stringify(again)}`);
  }
  return result;
}

async function openNote(driver, path) {
  await openVaultFile(driver, path);
  await collapseSidebars(driver);
  await showPreview(driver);
  await sleep(600);
}

function composeDashboardHero(desktopPath, mobilePath, mobileKind = "window") {
  const out = join(IMAGES, OUTPUTS.dashboardHero);
  const args = [
    join(ROOT, "scripts/compose-device-hero.py"),
    "--desktop",
    desktopPath,
    "--mobile",
    mobilePath,
    "--out",
    out,
    "--headline",
    DASHBOARD_HERO_HEADLINE,
    "--crop-chrome",
    "--desktop-fit",
    "cover-top",
    "--phone-fit",
    "cover-top",
    "--mobile-kind",
    mobileKind,
  ];
  const result = spawnSync("python3", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `compose dashboard hero failed: ${(result.stderr || result.stdout || "").trim()}`,
    );
  }
  if (!existsSync(out)) throw new Error(`Failed to write ${out}`);
  console.log((result.stdout || "").trim() || `Wrote ${out}`);
  return out;
}

async function hideNoteProperties(driver) {
  await driver.executeScript(`
    if (app.vault?.setConfig) {
      app.vault.setConfig("propertiesInDocument", "hidden");
    }
    for (const el of document.querySelectorAll(
      ".metadata-container, .metadata-properties-heading, .metadata-add-button",
    )) {
      el.style.setProperty("display", "none");
    }
  `);
}

async function prepareDashboardPhoneView(driver) {
  await hideNoteProperties(driver);
  await driver.executeScript(`
    const hide = [
      ".workspace-ribbon",
      ".view-header",
      ".workspace-tab-header-container",
      ".status-bar",
      ".inline-title",
      ".mod-header .inline-title",
      ".metadata-container",
    ];
    for (const sel of hide) {
      for (const el of document.querySelectorAll(sel)) {
        el.style.setProperty("display", "none", "important");
      }
    }
    const preview = document.querySelector(".markdown-preview-view, .markdown-reading-view");
    if (preview) {
      preview.style.setProperty("padding-top", "12px", "important");
      preview.style.setProperty("padding-left", "16px", "important");
      preview.style.setProperty("padding-right", "16px", "important");
    }
  `);
}

async function captureTo(driver, name, destName) {
  // Hover tooltips (sidebar toggle, book covers) linger after the mouse parks.
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

async function main() {
  const skip = e2eSkipReason();
  if (skip) {
    throw new Error(`Cannot capture screenshots: ${skip}`);
  }

  if (wantShot("dashboard")) assertDashboardBundle();
  prepareUserGuideVault();
  const launchFile = wantShot("bookShelf") ? FILES.bookShelf : FILES.dashboard;
  const launched = await launchForCapture(USER_GUIDE_VAULT, launchFile);
  const driver = await attachSelenium(undefined, launched.version);
  try {
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
    await resizeWindow(driver, 1920, 1200);

    if (wantShot("bookShelf")) {
      await openNote(driver, FILES.bookShelf);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      await waitForCoverImages(driver, 12);
      await parkMouse(driver);
      await sleep(900);
      await captureTo(driver, "user-guide-book-shelf", OUTPUTS.bookShelf);

      await openCover(driver, OPEN_COVER_TITLE);
      await captureTo(driver, "user-guide-book-shelf-open", OUTPUTS.bookShelfOpen);
      await parkMouse(driver);
    }

    if (wantShot("timer")) {
      await openNote(driver, FILES.timerItem);
      await waitCss(driver, '[data-testid="atomic-timer"]');
      await waitCss(driver, '[data-testid="atomic-timer-stop"]');
      await parkMouse(driver);
      await sleep(500);
      await captureTo(driver, "user-guide-reading-timer", OUTPUTS.timer);
    }

    if (wantShot("gymLog")) {
      await openNote(driver, FILES.gymSession);
      await waitCss(driver, '[data-testid="atomic-gym-log"]');
      await waitCss(driver, '[data-testid="atomic-gym-log-add"]');
      await parkMouse(driver);
      await sleep(500);
      await captureTo(driver, "user-guide-gym-log", OUTPUTS.gymLog);
    }

    if (wantShot("dashboard")) {
      await resizeWindow(driver, DASHBOARD_DESKTOP.width, DASHBOARD_DESKTOP.height);
      await openNote(driver, FILES.dashboard);
      await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
      await hideNoteProperties(driver);
      await parkMouse(driver);
      await sleep(500);
      const desktopSrc = await captureTo(driver, "user-guide-dashboard", OUTPUTS.dashboard);
      await captureFullPageProof(
        driver,
        '[data-testid="atomic-dashboard"]',
        "dashboard-desktop-fullpage",
        DASHBOARD_DESKTOP.width,
      );

      if (DASHBOARD_PHONE_SRC) {
        if (!existsSync(DASHBOARD_PHONE_SRC)) {
          throw new Error(`ATOMIC_DASHBOARD_PHONE_SRC missing: ${DASHBOARD_PHONE_SRC}`);
        }
        await composeDashboardHero(desktopSrc, DASHBOARD_PHONE_SRC, "phone");
      } else {
        await resizeWindow(driver, DASHBOARD_MOBILE.width, DASHBOARD_MOBILE.height);
        await openNote(driver, FILES.dashboard);
        await waitCss(driver, '[data-testid="atomic-dashboard-recent"]');
        await prepareDashboardPhoneView(driver);
        await parkMouse(driver);
        await sleep(600);
        await driver.executeScript(
          `document.querySelectorAll(".tooltip").forEach((el) => el.remove());`,
        );
        const mobileSrc = await saveScreenshot(driver, "readme-dashboard-mobile");
        await composeDashboardHero(desktopSrc, mobileSrc);
      }
      await captureFullPageProof(
        driver,
        '[data-testid="atomic-dashboard"]',
        "dashboard-mobile-fullpage",
        DASHBOARD_MOBILE.width,
      );
      await resizeWindow(driver, 1920, 1200);
    }

    if (wantShot("settings")) {
      await openNote(driver, FILES.bookShelf);
      await waitCss(driver, '[data-testid="atomic-bookshelf"]');
      await waitForCoverImages(driver, 12);
      await openAtomicSettings(driver);
      await waitCss(driver, '[data-testid="atomic-setting-activity"]');
      await driver.executeScript(`
      const heading = Array.from(document.querySelectorAll(".setting-item-heading, .setting-item-name"))
        .find((el) => /exercise types/i.test(el.textContent || ""));
      heading?.scrollIntoView({ block: "start" });
    `);
      await sleep(400);
      await captureTo(driver, "user-guide-settings", OUTPUTS.settings);
      await closeSettings(driver);
    }

    if (wantShot("enable")) {
      await resizeWindow(driver, 1280, 800);
      await openNote(driver, FILES.timerItem);
      await waitCss(driver, '[data-testid="atomic-timer"]');
      await openCommunityPlugins(driver);
      await sleep(600);
      await captureTo(driver, "user-guide-enable-plugin", OUTPUTS.enable);
    }
  } finally {
    await stopSession({ driver });
  }
}

await main();
