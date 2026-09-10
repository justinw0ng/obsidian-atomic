import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("README embeds one dashboard hero banner", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /docs\/images\/atomic-dashboard-hero\.png/);
  assert.doesNotMatch(readme, /atomic-dashboard-desktop\.png/);
  assert.doesNotMatch(readme, /atomic-dashboard-mobile\.png/);
  assert.doesNotMatch(readme, /\*\*Desktop\*\*/);
  assert.doesNotMatch(readme, /\*\*Phone\*\*/);
});

test("dashboard hero is a 1600x900 composed banner", () => {
  const path = join(root, "docs/images/atomic-dashboard-hero.png");
  assert.equal(existsSync(path), true);
  const png = readFileSync(path);
  const { width, height } = pngSize(png);
  assert.equal(width, 1600);
  assert.equal(height, 900);
  assert.ok(png.length > 40_000, `hero too small: ${png.length}`);
  assert.ok(png.length < 1_500_000, `hero too large: ${png.length}`);
});

test("hero compositor keeps daily-note defaults and accepts dashboard copy", () => {
  const src = readFileSync(join(root, "scripts/compose-device-hero.py"), "utf8");
  assert.match(src, /Your habits\. One daily note\./);
  assert.match(src, /--headline/);
  assert.match(src, /--crop-chrome/);
  assert.match(src, /cover-top/);
  assert.match(src, /--phone-fit/);
  assert.match(src, /--mobile-kind/);
  assert.match(src, /--phone-pad/);
  assert.match(src, /--scrub-scrollbars/);
  assert.match(src, /contain_padded/);
  assert.match(src, /electron_titlebar_height/);
});

test("dashboard hero capture uses a wider phone viewport so more UI is visible", () => {
  const src = readFileSync(join(root, "scripts/capture-user-guide-screenshots.mjs"), "utf8");
  assert.match(src, /DASHBOARD_MOBILE = \{ width: 480, height: 1040 \}/);
  assert.match(src, /"--desktop-fit",\s*"contain"/);
  assert.match(src, /"--phone-fit",\s*"contain"/);
  assert.doesNotMatch(src, /"--desktop-fit",\s*"cover-top"/);
  assert.doesNotMatch(src, /"--phone-fit",\s*"cover-top"/);
  assert.match(src, /ATOMIC_DASHBOARD_PHONE_SRC/);
  assert.match(src, /prepareDashboardPhoneView/);
  assert.match(src, /hideCaptureScrollbars/);
  assert.match(src, /"--phone-pad",\s*"22"/);
  assert.match(src, /--scrub-scrollbars/);
});
