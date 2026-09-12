/**
 * GIF helpers for user-guide captures.
 * Frame grabbing uses Selenium screenshots; assembly is assemble-docs-gif.py.
 */
import { spawnSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { saveScreenshot, sleep } from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const GIF_FRAME_ROOT = "/tmp/atomic-user-guide-gif-frames";
export const ASSEMBLE_GIF = join(ROOT, "scripts/assemble-docs-gif.py");
export const IMAGES = join(ROOT, "docs/images");

export const LIGHTBOX_STILLS = {
  rest: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_desktop_rest.png",
  hover: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_desktop_hover.png",
  popup: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_desktop_lightbox.png",
  form: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_form.png",
  mobileRest: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_mobile_rest.png",
  mobilePopup: "/cursor/stores/bc-c0dad2ad-85e0-46cf-a0e0-1846b4ce8f67/media/cue-cards/lightbox/cue_hero_mobile_lightbox.png",
};

export function frameDir(name) {
  const dir = join(GIF_FRAME_ROOT, name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function listPngs(dir) {
  return readdirSync(dir)
    .filter((name) => name.endsWith(".png"))
    .sort()
    .map((name) => join(dir, name));
}

export async function grabFrame(driver, dir, index) {
  await driver.executeScript(
    `document.querySelectorAll(".notice, .tooltip").forEach((el) => el.remove());`,
  );
  const src = await saveScreenshot(driver, `guide-frame-${index}`);
  const dest = join(dir, `${String(index).padStart(3, "0")}.png`);
  copyFileSync(src, dest);
  return dest;
}

export async function grabHold(driver, dir, startIndex, count, gapMs = 160) {
  const paths = [];
  for (let i = 0; i < count; i += 1) {
    paths.push(await grabFrame(driver, dir, startIndex + i));
    if (i < count - 1) await sleep(gapMs);
  }
  return paths;
}

export function assembleGif(frames, outName, options = {}) {
  const out = join(IMAGES, outName);
  const args = [ASSEMBLE_GIF, "--out", out];
  if (options.maxWidth) args.push("--max-width", String(options.maxWidth));
  if (options.durationMs) args.push("--duration-ms", String(options.durationMs));
  if (options.holdFirst !== undefined) args.push("--hold-first", String(options.holdFirst));
  if (options.holdLast !== undefined) args.push("--hold-last", String(options.holdLast));
  if (options.colors) args.push("--colors", String(options.colors));
  if (typeof frames === "string") {
    args.push("--frames", frames);
  } else {
    for (const frame of frames) args.push("--frames", frame);
  }
  const result = spawnSync("python3", args, { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`assemble gif failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (!existsSync(out)) throw new Error(`Failed to write ${out}`);
  console.log((result.stdout || "").trim() || `Wrote ${out}`);
  return out;
}

export function stillsToGif(stills, outName, options = {}) {
  const frames = stills.filter((path) => path && existsSync(path));
  if (!frames.length) {
    throw new Error(`No stills exist for ${outName}: ${stills.join(", ")}`);
  }
  return assembleGif(frames, outName, options);
}

/** Upcoming fly-to-center popup (stills from the in-flight lightbox work). */
export function assembleCuePopupPreviewGif() {
  const frames = [LIGHTBOX_STILLS.rest, LIGHTBOX_STILLS.hover, LIGHTBOX_STILLS.popup];
  const missing = frames.filter((path) => !existsSync(path));
  if (missing.length) {
    console.warn(`Skip cue popup GIF; missing stills: ${missing.join(", ")}`);
    return null;
  }
  return assembleGif(frames, "atomic-cue-popup.gif", {
    maxWidth: 1280,
    durationMs: 700,
    holdFirst: 1,
    holdLast: 2,
    colors: 96,
  });
}

export function assembleCueHoverPreviewGif() {
  const frames = [LIGHTBOX_STILLS.rest, LIGHTBOX_STILLS.hover];
  if (frames.some((path) => !existsSync(path))) return null;
  if (existsSync(join(IMAGES, "atomic-cues-hover.gif"))) return join(IMAGES, "atomic-cues-hover.gif");
  return assembleGif(frames, "atomic-cues-hover.gif", {
    maxWidth: 1280,
    durationMs: 600,
    holdFirst: 1,
    holdLast: 2,
    colors: 96,
  });
}
