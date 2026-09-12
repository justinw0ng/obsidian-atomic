import test from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("Jersey 20 is vendored for the README hero title", () => {
  assert.equal(existsSync(join(root, "docs/fonts/Jersey20-Regular.ttf")), true);
});

test("Caveat latin is vendored for cue-card handwriting", () => {
  assert.equal(existsSync(join(root, "fonts/caveat-latin-400.woff2")), true);
});
