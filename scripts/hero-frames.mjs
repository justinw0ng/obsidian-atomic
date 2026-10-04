/**
 * Shared hero chrome: shells from the redesign frames, live note pasted in.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { saveScreenshot } from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
export const HERO_SHELL_DIR = process.env.ATOMIC_HERO_SHELLS || "/tmp/atomic-hero-shells";

const SHELL_NAMES = [
  "daily-desktop",
  "daily-phone",
  "dashboard-desktop",
  "dashboard-phone",
  "cues-desktop",
  "cues-phone",
];

function shellsReady(manifest) {
  return SHELL_NAMES.every((name) => {
    const file = manifest?.shells?.[name]?.file;
    return Boolean(file) && existsSync(file) && manifest.shells[name].hole?.width > 40;
  });
}

export function ensureHeroShells() {
  const manifestPath = join(HERO_SHELL_DIR, "manifest.json");
  if (existsSync(manifestPath)) {
    const cached = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (shellsReady(cached)) return cached;
  }
  const result = spawnSync(process.execPath, [join(ROOT, "scripts/capture-hero-shells.mjs")], {
    encoding: "utf8",
    env: { ...process.env, ATOMIC_HERO_SHELLS: HERO_SHELL_DIR },
  });
  if (result.status !== 0) {
    throw new Error(`hero shells failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (result.stdout) process.stdout.write(result.stdout);
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  if (!shellsReady(manifest)) throw new Error(`hero shells incomplete: ${manifestPath}`);
  return manifest;
}

export function padHeroContent({ scene, kind, content, out }) {
  const manifest = ensureHeroShells();
  const name = `${scene}-${kind === "phone" ? "phone" : "desktop"}`;
  const hole = manifest.shells[name].hole;
  mkdirSync(dirname(out), { recursive: true });
  const result = spawnSync(
    "python3",
    [
      join(ROOT, "scripts/pad-hero-content.py"),
      "--src",
      content,
      "--out",
      out,
      "--aspect-width",
      String(hole.width),
      "--aspect-height",
      String(hole.height),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`pad hero content failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (!existsSync(out)) throw new Error(`Failed to write ${out}`);
  console.log((result.stdout || "").trim() || `Wrote ${out}`);
  return out;
}

export function frameHeroContent({ scene, kind, content, out }) {
  ensureHeroShells();
  mkdirSync(dirname(out), { recursive: true });
  const result = spawnSync(
    "python3",
    [
      join(ROOT, "scripts/frame-hero-content.py"),
      "--scene",
      scene,
      "--kind",
      kind,
      "--content",
      content,
      "--out",
      out,
      "--shells",
      HERO_SHELL_DIR,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`frame hero content failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (!existsSync(out)) throw new Error(`Failed to write ${out}`);
  console.log((result.stdout || "").trim() || `Wrote ${out}`);
  return out;
}

export function heroHoleSize(scene, kind) {
  const manifest = ensureHeroShells();
  const name = `${scene}-${kind === "phone" ? "phone" : "desktop"}`;
  const entry = manifest.shells[name];
  return {
    width: Math.max(320, Math.round(entry.holeCssWidth)),
    height: Math.max(480, Math.round(entry.holeCssHeight)),
  };
}

export async function capturePreviewCrop(driver, dest) {
  const box = await driver.executeScript(`
    const el = document.querySelector(".markdown-preview-view")
      || document.querySelector(".markdown-reading-view")
      || document.querySelector(".view-content");
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
  `);
  if (!box || box.width < 20 || box.height < 20) {
    throw new Error(`missing preview for ${dest}`);
  }
  const full = await saveScreenshot(driver, `hero-preview-${Date.now()}`);
  mkdirSync(dirname(dest), { recursive: true });
  const result = spawnSync(
    "python3",
    [
      join(ROOT, "scripts/crop-image-rect.py"),
      "--src",
      full,
      "--out",
      dest,
      "--x",
      String(box.x),
      "--y",
      String(box.y),
      "--width",
      String(box.width),
      "--height",
      String(box.height),
      "--viewport-width",
      String(box.viewportWidth),
      "--viewport-height",
      String(box.viewportHeight),
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`preview crop failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  return dest;
}
