import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
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

test("user guide is topic-by-topic and user-centric", () => {
  assert.match(guide, /^## What Atomic Tracker does$/m);
  assert.match(guide, /^## Install Atomic Tracker$/m);
  assert.match(guide, /^## Choose your habits$/m);
  assert.match(guide, /^## See a year of habits$/m);
  assert.match(guide, /^## See today$/m);
  assert.match(guide, /^## See the year on one page$/m);
  assert.match(guide, /^## Start a gym or golf session$/m);
  assert.match(guide, /^## Time a session$/m);
  assert.match(guide, /^## Log gym sets$/m);
  assert.match(guide, /^## Keep cues you will reuse$/m);
  assert.match(guide, /^## Track reading$/m);
  assert.match(guide, /^## Time your reading$/m);
  assert.match(guide, /^## See your books on a shelf$/m);
  assert.match(guide, /improves daily habit tracking|records exercise, reading/);
  assert.match(guide, /upcoming popup/);
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
