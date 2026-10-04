import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pngSize(buffer) {
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("README embeds one gym log hero banner", () => {
  const readme = readFileSync(join(root, "README.md"), "utf8");
  assert.match(readme, /## Gym log/);
  assert.match(readme, /docs\/images\/atomic-gym-hero\.png/);
  assert.doesNotMatch(readme, /atomic-gym-hero\.gif/);
});

test("gym log hero is a 1600x900 composed banner", () => {
  const path = join(root, "docs/images/atomic-gym-hero.png");
  assert.equal(existsSync(path), true);
  const png = readFileSync(path);
  const { width, height } = pngSize(png);
  assert.equal(width, 1600);
  assert.equal(height, 900);
  assert.ok(png.length > 40_000, `hero too small: ${png.length}`);
  assert.ok(png.length < 1_500_000, `hero too large: ${png.length}`);
});

test("gym hero capture uses the shared device chrome and stacked live wells", () => {
  const src = readFileSync(join(root, "scripts/capture-gym-hero.mjs"), "utf8");
  assert.match(src, /from "\.\/docs-capture\.mjs"/);
  assert.match(src, /ensureDocsBundle/);
  assert.match(src, /restoreBundledMain/);
  assert.match(src, /launchObsidian/);
  assert.match(src, /composeDeviceHero/);
  assert.match(src, /frameHeroContent/);
  assert.match(src, /padHeroContent/);
  assert.match(src, /scene: "daily"/);
  assert.match(src, /preframed: true/);
  assert.match(src, /capturePreviewCrop/);
  assert.match(src, /hideCaptureScrollbars/);
  assert.match(src, /margin-left: auto/);
  assert.match(src, /margin-right: auto/);
  assert.match(src, /Your sets\. One gym note\./);
  assert.match(src, /atomic-timer/);
  assert.match(src, /atomic-gym-log/);
  assert.match(src, /atomic-cue-log/);
  assert.match(src, /fitPhoneWindowToNote/);
  assert.match(src, /E2E_TIMER_FENCE/);
  assert.match(src, /E2E_CUE_LOG_FENCE/);
  assert.match(src, /Brace before the first plate moves/);
  assert.match(src, /Knees track over the toes/);
  assert.doesNotMatch(src, /cover-top/);
  assert.doesNotMatch(src, /cropChrome: true/);
  assert.doesNotMatch(src, /\/cursor\/stores\//);
});

test("package.json exposes the gym hero capture", () => {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  assert.match(pkg.scripts["docs:gym-hero"], /capture-gym-hero\.mjs/);
});

test("pad-hero-content adds height so a wide shot keeps both sides", (t) => {
  try {
    execFileSync("python3", ["-c", "from PIL import Image"], { stdio: "ignore" });
  } catch {
    t.skip("Pillow is not installed");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "atomic-gym-hero-pad-"));
  try {
    const src = join(dir, "wide.png");
    const out = join(dir, "padded.png");
    const drawn = spawnSync(
      "python3",
      [
        "-c",
        `
from PIL import Image
image = Image.new("RGB", (80, 20), (255, 255, 255))
for x in range(80):
    image.putpixel((x, 5), (10, 10, 10))
image.putpixel((2, 8), (200, 0, 0))
image.putpixel((77, 8), (0, 0, 200))
image.save("${src}")
`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(drawn.status, 0, drawn.stderr);
    const padded = spawnSync(
      "python3",
      [
        join(root, "scripts/pad-hero-content.py"),
        "--src",
        src,
        "--out",
        out,
        "--aspect-width",
        "80",
        "--aspect-height",
        "50",
      ],
      { encoding: "utf8" },
    );
    assert.equal(padded.status, 0, padded.stderr || padded.stdout);
    const size = spawnSync(
      "python3",
      [
        "-c",
        "import sys; from PIL import Image; image = Image.open(sys.argv[1]); print(image.size[0], image.size[1], *image.getpixel((2, 8)), *image.getpixel((77, 8)))",
        out,
      ],
      { encoding: "utf8" },
    );
    assert.equal(size.status, 0, size.stderr);
    assert.equal(size.stdout.trim(), "80 50 200 0 0 0 0 200");

    const tall = join(dir, "tall.png");
    const tallOut = join(dir, "tall-padded.png");
    const tallDrawn = spawnSync(
      "python3",
      [
        "-c",
        `
from PIL import Image
image = Image.new("RGB", (20, 80), (255, 255, 255))
image.putpixel((1, 4), (200, 0, 0))
image.putpixel((18, 4), (0, 0, 200))
image.save("${tall}")
`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(tallDrawn.status, 0, tallDrawn.stderr);
    const tallPadded = spawnSync(
      "python3",
      [
        join(root, "scripts/pad-hero-content.py"),
        "--src",
        tall,
        "--out",
        tallOut,
        "--aspect-width",
        "50",
        "--aspect-height",
        "80",
      ],
      { encoding: "utf8" },
    );
    assert.equal(tallPadded.status, 0, tallPadded.stderr || tallPadded.stdout);
    const tallSize = spawnSync(
      "python3",
      [
        "-c",
        "import sys; from PIL import Image; image = Image.open(sys.argv[1]); print(image.size[0], image.size[1], *image.getpixel((16, 4)), *image.getpixel((33, 4)))",
        tallOut,
      ],
      { encoding: "utf8" },
    );
    assert.equal(tallSize.status, 0, tallSize.stderr);
    assert.equal(tallSize.stdout.trim(), "50 80 200 0 0 0 0 200");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
