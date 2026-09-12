/**
 * Shared Selenium helpers for README / user-guide captures.
 * Launch and teardown stay on e2e/lib/obsidian.mjs (launchObsidian, stopSession).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { Key } from "selenium-webdriver";
import { openVaultFile, sleep } from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export async function collapseSidebars(driver) {
  await driver.executeScript(`
    app.workspace.leftSplit?.collapse?.();
    app.workspace.rightSplit?.collapse?.();
  `);
}

export async function showPreview(driver) {
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

export async function parkMouse(driver) {
  try {
    await driver.actions({ async: false }).sendKeys(Key.ESCAPE).perform();
    await driver.actions({ async: false }).move({ x: 12, y: 12, origin: "viewport" }).perform();
  } catch {
    // Mouse parking is best-effort.
  }
}

export async function openPreviewNote(driver, path) {
  await openVaultFile(driver, path);
  await collapseSidebars(driver);
  await showPreview(driver);
  await sleep(600);
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

export async function resizeWindow(driver, width, height) {
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

export async function hideNoteProperties(driver) {
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

export async function hideCaptureScrollbars(driver, extraCss = "") {
  await driver.executeScript(
    `
    const extraCss = arguments[0];
    const root = document.documentElement;
    root.style.setProperty("--scrollbar-thumb-bg", "transparent", "important");
    root.style.setProperty("--scrollbar-active-thumb-bg", "transparent", "important");
    root.style.setProperty("--scrollbar-bg", "transparent", "important");
    const style = document.getElementById("atomic-hero-hide-scrollbars")
      || document.createElement("style");
    style.id = "atomic-hero-hide-scrollbars";
    style.textContent = \`
      * { scrollbar-width: none !important; }
      *::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
      \${extraCss}
    \`;
    document.head.appendChild(style);
    for (const el of document.querySelectorAll(
      ".markdown-preview-view, .markdown-reading-view, .cm-scroller, .view-content, .workspace-leaf-content",
    )) {
      el.style.setProperty("overflow", "hidden", "important");
    }
    document.querySelectorAll(".notice, .tooltip").forEach((el) => el.remove());
    `,
    extraCss,
  );
}

export function buildDeviceHeroArgs({
  desktop,
  mobile,
  out,
  headline,
  cropChrome = false,
  desktopFit = "contain",
  phoneFit = "contain",
  mobileKind = "window",
  phonePad = 0,
  scrubScrollbars = false,
}) {
  const args = [
    join(ROOT, "scripts/compose-device-hero.py"),
    "--desktop",
    desktop,
    "--mobile",
    mobile,
    "--out",
    out,
    "--headline",
    headline,
    "--desktop-fit",
    desktopFit,
    "--phone-fit",
    phoneFit,
    "--mobile-kind",
    mobileKind,
    "--phone-pad",
    String(phonePad),
  ];
  if (cropChrome) args.push("--crop-chrome");
  if (scrubScrollbars) args.push("--scrub-scrollbars");
  return args;
}

export function composeDeviceHero(options) {
  const args = buildDeviceHeroArgs(options);
  const result = spawnSync("python3", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`compose device hero failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (!existsSync(options.out)) throw new Error(`Failed to write ${options.out}`);
  console.log((result.stdout || "").trim() || `Wrote ${options.out}`);
  return options.out;
}
