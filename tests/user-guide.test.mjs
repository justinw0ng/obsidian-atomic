import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const guide = readFileSync(join(root, "docs/USER_GUIDE.md"), "utf8");

function gifHeader(buffer) {
  const header = buffer.subarray(0, 6).toString("ascii");
  assert.ok(header === "GIF89a" || header === "GIF87a", `unexpected GIF header: ${header}`);
}

test("user guide has no journey-style metaphors", () => {
  assert.doesNotMatch(guide, /\bjourney\b/i);
  assert.doesNotMatch(guide, /\bvoyage\b/i);
  assert.doesNotMatch(guide, /\bodyssey\b/i);
  assert.doesNotMatch(guide, /\bquest\b/i);
  assert.doesNotMatch(guide, /\badventure\b/i);
  assert.doesNotMatch(guide, /\bpilgrimage\b/i);
  assert.doesNotMatch(guide, /\bsaga\b/i);
});

test("user guide follows one day from today's note", () => {
  assert.match(guide, /^## Install Atomic Tracker$/m);
  assert.match(guide, /^## Open today’s note$/m);
  assert.match(guide, /^## Heatmap$/m);
  assert.match(guide, /^## Timer$/m);
  assert.match(guide, /^## Gym log$/m);
  assert.match(guide, /^## Cues$/m);
  assert.match(guide, /^## Reading$/m);
  assert.match(guide, /^## Cue cards and the shelf$/m);
  assert.match(guide, /examples\/daily-notes\/2026-08-11\.md/);
  assert.match(guide, /records gym, golf, and reading/);
  assert.match(guide, /enlarge it in the center/);
});

test("user guide has no capture or author meta", () => {
  assert.doesNotMatch(guide, /docs\/images/);
  assert.doesNotMatch(guide, /docs\/demo-covers/);
  assert.doesNotMatch(guide, /Readable line length/);
  assert.doesNotMatch(guide, /captured on Linux/);
  assert.doesNotMatch(guide, /window chrome/);
  assert.doesNotMatch(guide, /publisher artwork/);
  assert.doesNotMatch(guide, /invented titles/);
  assert.doesNotMatch(guide, /Framer/);
  assert.doesNotMatch(guide, /upcoming popup/);
  assert.doesNotMatch(guide, /OBSIDIAN_PLUGIN_OUT/);
  assert.doesNotMatch(guide, /heading above the UI/);
  assert.doesNotMatch(guide, /scrollbar hidden/);
  assert.doesNotMatch(guide, /plugin chrome/);
  assert.doesNotMatch(guide, /npm install/);
  assert.doesNotMatch(guide, /npm run build/);
  assert.doesNotMatch(guide, /Build this plugin/);
  assert.doesNotMatch(guide, /Vault layout/);
  assert.doesNotMatch(guide, /```text/);
});

test("user guide usage images are GIFs that exist", () => {
  const embeds = [...guide.matchAll(/\]\(\.\/images\/([^)]+)\)/g)].map((match) => match[1]);
  assert.ok(embeds.length >= 10, `expected many clips, got ${embeds.length}`);
  for (const name of embeds) {
    assert.match(name, /\.gif$/, `user guide still uses a still: ${name}`);
    const path = join(root, "docs/images", name);
    assert.equal(existsSync(path), true, `missing ${name}`);
    const buffer = readFileSync(path);
    gifHeader(buffer);
    assert.ok(buffer.length > 2_000, `${name} is too small: ${buffer.length}`);
  }
});

test("assemble-docs-gif writes a looping GIF from PNG frames", (t) => {
  try {
    execFileSync("python3", ["-c", "from PIL import Image"], { stdio: "ignore" });
  } catch {
    t.skip("Pillow is not installed");
    return;
  }
  const dir = join(tmpdir(), `atomic-guide-gif-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  const out = join(dir, "out.gif");
  try {
    execFileSync(
      "python3",
      [
        "-c",
        [
          "from PIL import Image",
          `Image.new("RGB", (24, 16), (200, 40, 40)).save("${join(dir, "000.png")}")`,
          `Image.new("RGB", (24, 16), (40, 80, 200)).save("${join(dir, "001.png")}")`,
        ].join("\n"),
      ],
      { stdio: "ignore" },
    );
    execFileSync(
      "python3",
      [
        join(root, "scripts/assemble-docs-gif.py"),
        "--frames",
        dir,
        "--out",
        out,
        "--max-width",
        "24",
        "--duration-ms",
        "80",
      ],
      { stdio: "ignore" },
    );
    const gif = readFileSync(out);
    gifHeader(gif);
    assert.equal(gif.readUInt16LE(6), 24);
    assert.equal(gif.readUInt16LE(8), 16);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("README install link points at the install topic", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /docs\/USER_GUIDE\.md#install-atomic-tracker/);
  assert.doesNotMatch(readme, /#4-install-atomic-tracker/);
});
