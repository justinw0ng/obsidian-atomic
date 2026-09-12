/**
 * GIF helpers for user-guide captures.
 * Frame grabbing uses Selenium screenshots; assembly is assemble-docs-gif.py.
 * Cue-popup stills come from ATOMIC_CUE_POPUP_STILLS (a directory of PNGs), never a store path.
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
export const CUE_POPUP_GIF = "atomic-cue-popup.gif";

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

/** Rebuild the cue-popup clip from ATOMIC_CUE_POPUP_STILLS. Keeps the committed GIF when unset. */
export function assembleCuePopupPreviewGif() {
  const out = join(IMAGES, CUE_POPUP_GIF);
  const dir = (process.env.ATOMIC_CUE_POPUP_STILLS || "").trim();
  if (!dir) {
    if (existsSync(out)) {
      console.log(`Keep committed ${CUE_POPUP_GIF} (ATOMIC_CUE_POPUP_STILLS unset)`);
      return out;
    }
    throw new Error(
      `${CUE_POPUP_GIF} is missing. Set ATOMIC_CUE_POPUP_STILLS to a directory of PNG stills.`,
    );
  }
  const frames = listPngs(dir);
  if (!frames.length) {
    throw new Error(`ATOMIC_CUE_POPUP_STILLS has no PNGs: ${dir}`);
  }
  return assembleGif(frames, CUE_POPUP_GIF, {
    maxWidth: 1280,
    durationMs: 700,
    holdFirst: 1,
    holdLast: 2,
    colors: 96,
  });
}
