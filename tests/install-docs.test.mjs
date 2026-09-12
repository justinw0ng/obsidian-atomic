import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function readDoc(relPath) {
  return readFileSync(join(root, relPath), "utf8");
}

function zipMentionLines(markdown) {
  return markdown
    .split("\n")
    .map((line, index) => ({ line, lineNumber: index + 1 }))
    .filter(({ line }) => /\.zip\b|\bzip\b/i.test(line));
}

function lineForbidsZip(line) {
  return /\bdo\s+\*\*not\*\*|\bdo not\b|\bdon't\b|\bnot use\b|\bdoes not publish\b|\bdo not publish\b|\bdo not attach\b|\bno zip\b|\bwrong artifact\b/i.test(
    line,
  );
}

test("user-facing install docs copy the three release files, not a zip", () => {
  const docs = [
    ["README.md", readDoc("README.md")],
    ["docs/USER_GUIDE.md", readDoc("docs/USER_GUIDE.md")],
    ["examples/README.md", readDoc("examples/README.md")],
  ];

  for (const [name, text] of docs) {
    for (const { line, lineNumber } of zipMentionLines(text)) {
      assert.ok(
        lineForbidsZip(line),
        `${name}:${lineNumber} mentions zip without forbidding it: ${line}`,
      );
      assert.doesNotMatch(
        line,
        /\bdownload\b[^.!\n]{0,80}\bzip\b/i,
        `${name}:${lineNumber} tells readers to download a zip: ${line}`,
      );
    }
  }

  const guide = docs[1][1];
  const readme = docs[0][1];
  for (const [name, text] of [
    ["README.md", readme],
    ["docs/USER_GUIDE.md", guide],
  ]) {
    assert.match(text, /main\.js/);
    assert.match(text, /manifest\.json/);
    assert.match(text, /styles\.css/);
    assert.match(text, /\.obsidian\/plugins\/atomic-tracker/);
  }

  assert.match(guide, /Manual install from a GitHub Release/);
  assert.match(guide, /Source code \(zip\)/);
  assert.doesNotMatch(guide, /Build this plugin from source/);
});

test("release skill does not treat a zip as the sideload path", () => {
  const release = readDoc(
    ".cursor/skills/obsidian-plugin-e2e/references/release.md",
  );
  assert.doesNotMatch(release, /zip is optional for local sideload/i);
  assert.match(
    release,
    /Manual install copies those three files into `\.obsidian\/plugins\/atomic-tracker\/`/,
  );
  assert.match(
    release,
    /Do not use “Source code \(zip\)” or any zip asset/,
  );
});
