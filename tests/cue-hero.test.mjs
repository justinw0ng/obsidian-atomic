import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CUE_HERO_FILES,
  CUE_HERO_HEADLINE,
  CUE_HERO_TODAY,
  GOLF_SHOWCASE_CUES,
  golfShowcaseByDate,
} from "../scripts/cue-hero-content.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("README embeds one cue-card hero banner", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /docs\/images\/atomic-cue-hero\.gif/);
  assert.match(readme, /## Cue cards/);
});

test("cue hero is a 1600x900 composed banner", () => {
  const path = join(root, "docs/images/atomic-cue-hero.png");
  assert.equal(existsSync(path), true);
  const png = readFileSync(path);
  const { width, height } = pngSize(png);
  assert.equal(width, 1600);
  assert.equal(height, 900);
  assert.ok(png.length > 40_000, `hero too small: ${png.length}`);
  assert.ok(png.length < 1_500_000, `hero too large: ${png.length}`);
});

test("cue hero gif is a looping 1600x900 banner", () => {
  const path = join(root, "docs/images/atomic-cue-hero.gif");
  assert.equal(existsSync(path), true);
  const gif = readFileSync(path);
  assert.equal(gif.subarray(0, 6).toString(), "GIF89a");
  assert.equal(gif.readUInt16LE(6), 1600);
  assert.equal(gif.readUInt16LE(8), 900);
  assert.ok(gif.length > 80_000, `gif too small: ${gif.length}`);
  assert.ok(gif.length < 2_500_000, `gif too large: ${gif.length}`);
});

test("cue hero capture is a scenario on the shared docs-capture helpers", () => {
  const src = readFileSync(join(root, "scripts/capture-cue-hero.mjs"), "utf8");
  assert.match(src, /from "\.\/docs-capture\.mjs"/);
  assert.match(src, /launchObsidian/);
  assert.match(src, /stopSession/);
  assert.match(src, /composeDeviceHero/);
  assert.match(src, /cropChrome: false/);
  assert.match(src, /\/tmp\/atomic-cue-hero-review/);
  assert.doesNotMatch(src, /\/cursor\/stores\//);
  assert.doesNotMatch(src, /function launchForCapture/);
  assert.doesNotMatch(src, /function resizeWindow/);
  assert.doesNotMatch(src, /function parkMouse/);
  assert.doesNotMatch(src, /openlibrary/i);
});

test("cue hero capture hides scrollbars and centers the phone fan", () => {
  const src = readFileSync(join(root, "scripts/capture-cue-hero.mjs"), "utf8");
  assert.match(src, /--scrollbar-thumb-bg/);
  assert.match(src, /fitness-heatmap-scroll/);
  assert.match(src, /atomic-book-shelf-row/);
  assert.match(src, /atomic-cue-fan/);
  assert.match(src, /justify-content: center/);
  assert.match(src, /max-width: 600px/);
  assert.match(src, /margin-left: auto/);
  assert.match(src, /CUE_HERO_HEADLINE/);
  assert.match(src, /atomic-cue-card/);
  assert.match(src, /trim-hero-shot\.py/);
  assert.match(src, /openLightbox/);
  assert.match(src, /atomic-cue-lightbox/);
  assert.match(src, /animate-cue-hero-gif\.py/);
  assert.match(src, /cue_hero_desktop_lightbox/);
  assert.match(src, /cue_hero_mobile_lightbox/);
});

test("cue hero gif script flies from hover to the centered card", () => {
  const src = readFileSync(join(root, "scripts/animate-cue-hero-gif.py"), "utf8");
  assert.match(src, /animate-hero-gif\.py/);
  assert.match(src, /save_gif/);
  assert.match(src, /compose-device-hero\.py/);
  assert.match(src, /FLY_FRAMES/);
  assert.match(src, /Image\.blend/);
  assert.match(src, /--lightbox/);
  assert.match(src, /--mobile-lightbox/);
  assert.match(src, /sys\.modules\[name\]/);
});

test("compose-device-hero still accepts cue headline copy", () => {
  assert.equal(CUE_HERO_HEADLINE, "Your cues. One index card.");
  const src = readFileSync(join(root, "scripts/compose-device-hero.py"), "utf8");
  assert.match(src, /--headline/);
  assert.match(src, /--scrub-scrollbars/);
});

test("golf showcase dates cover today plus twelve unique earlier cues", () => {
  const dates = [
    "2026-07-01",
    "2026-07-08",
    "2026-07-15",
    "2026-07-22",
    "2026-07-26",
    "2026-07-29",
    "2026-08-01",
    "2026-08-02",
    "2026-08-05",
    "2026-08-08",
    "2026-08-09",
    "2026-08-10",
    CUE_HERO_TODAY,
    "2026-08-12",
  ];
  const extras = golfShowcaseByDate(dates, CUE_HERO_TODAY);
  assert.deepEqual(extras.get(CUE_HERO_TODAY), GOLF_SHOWCASE_CUES.slice(0, 3));
  assert.equal(extras.get("2026-08-12"), undefined);
  assert.equal(extras.get("2026-08-10")?.[0], GOLF_SHOWCASE_CUES[14]);
  const unique = [...extras.values()].flat();
  assert.equal(new Set(unique).size, GOLF_SHOWCASE_CUES.length);
});

test("seed --cue-hero writes Cues.md, the form, and unique golf cues", () => {
  const vault = mkdtempSync(join(tmpdir(), "atomic-cue-hero-"));
  try {
    const result = spawnSync(
      process.execPath,
      [
        join(root, "scripts/seed-readme-demo-vault.mjs"),
        "--vault",
        vault,
        "--book-limit",
        "1",
        "--cue-hero",
      ],
      { cwd: root, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    const golfCues = readFileSync(join(vault, CUE_HERO_FILES.golfCues), "utf8");
    assert.match(golfCues, /```atomic-golf-cues/);
    const today = readFileSync(join(vault, CUE_HERO_FILES.golfToday), "utf8");
    assert.match(today, /```atomic-cue-log/);
    assert.match(today, /Finish tall, belt buckle to the target/);
    assert.match(today, /Short game focus/);
    const pluginDir = join(vault, ".obsidian/plugins/atomic-tracker");
    assert.equal(existsSync(join(pluginDir, "fonts/caveat-latin-400.woff2")), true);
  } finally {
    rmSync(vault, { recursive: true, force: true });
  }
});
