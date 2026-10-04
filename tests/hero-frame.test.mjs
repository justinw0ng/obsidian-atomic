import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function pixel(path, x, y) {
  const result = spawnSync(
    "python3",
    [
      "-c",
      "import sys; from PIL import Image; image = Image.open(sys.argv[1]).convert('RGB'); print(*image.getpixel((int(sys.argv[2]), int(sys.argv[3]))))",
      path,
      String(x),
      String(y),
    ],
    { encoding: "utf8" },
  );
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
}

test("frame-hero-content fills the magenta hole and keeps overlapping chrome", (t) => {
  try {
    spawnSync("python3", ["-c", "from PIL import Image"], { stdio: "ignore" });
  } catch {
    t.skip("Pillow is not installed");
    return;
  }
  const dir = mkdtempSync(join(tmpdir(), "atomic-hero-frame-"));
  try {
    const drawn = spawnSync(
      "python3",
      [
        "-c",
        `
from PIL import Image
shell = Image.new("RGB", (80, 60), (200, 200, 200))
for y in range(15, 45):
    for x in range(10, 60):
        shell.putpixel((x, y), (255, 0, 255))
for y in range(15, 27):
    for x in range(10, 22):
        shell.putpixel((x, y), (0, 0, 255))
shell.save("${dir}/daily-desktop.png")
Image.new("RGB", (8, 8), (220, 10, 10)).save("${dir}/content.png")
`,
      ],
      { encoding: "utf8" },
    );
    assert.equal(drawn.status, 0, drawn.stderr);
    writeFileSync(
      join(dir, "manifest.json"),
      JSON.stringify({
        shells: {
          "daily-desktop": {
            file: join(dir, "daily-desktop.png"),
            hole: { x: 10, y: 15, width: 50, height: 30 },
          },
        },
      }),
    );
    const out = join(dir, "framed.png");
    const framed = spawnSync(
      "python3",
      [
        join(root, "scripts/frame-hero-content.py"),
        "--scene",
        "daily",
        "--kind",
        "desktop",
        "--content",
        join(dir, "content.png"),
        "--out",
        out,
        "--shells",
        dir,
      ],
      { encoding: "utf8" },
    );
    assert.equal(framed.status, 0, framed.stderr || framed.stdout);
    assert.equal(pixel(out, 0, 0), "200 200 200");
    assert.equal(pixel(out, 16, 21), "0 0 255");
    assert.equal(pixel(out, 40, 30), "220 10 10");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
