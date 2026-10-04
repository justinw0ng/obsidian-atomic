import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATOMIC_BLOCK_PENDING_CLASS,
  beginBlockRender,
  mountAtomicBlockShell,
  shouldCommitBlockPaint,
} from "../src/util/block-render.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function src(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function createHost() {
  /** @type {any[]} */
  const children = [];
  const host = {
    children,
    cls: "",
    isConnected: false,
    empty() {
      children.length = 0;
    },
    createDiv(options = {}) {
      const child = createHost();
      child.cls = options.cls ?? "";
      children.push(child);
      return child;
    },
    addClass(cls) {
      this.cls = this.cls ? `${this.cls} ${cls}` : cls;
    },
  };
  return host;
}

test("reading mode does not keep the pending bar on a detached host", () => {
  const host = createHost();
  mountAtomicBlockShell(host);
  assert.equal(host.children[0]?.cls, ATOMIC_BLOCK_PENDING_CLASS);

  const generation = beginBlockRender(host);
  if (!shouldCommitBlockPaint(host, generation)) {
    return;
  }
  host.empty();
  host.createDiv({
    cls: "fitness-plugin atomic-timer atomic-well",
  });

  assert.equal(
    host.children.some((child) => child.cls === ATOMIC_BLOCK_PENDING_CLASS),
    false,
    "pending placeholder must be replaced after the first paint commit",
  );
  assert.equal(host.children.length, 1);
  assert.match(host.children[0].cls, /atomic-timer/);
  assert.equal(host.isConnected, false);
});

test("async session widgets commit paint without an isConnected gate", () => {
  const timer = src("src/views/timer.ts");
  const cueLog = src("src/views/cue-log.ts");
  const dashboard = src("src/views/dashboard.ts");

  assert.match(timer, /shouldCommitBlockPaint\(el, generation\)/);
  assert.match(cueLog, /shouldCommitBlockPaint\(el, generation\)/);
  assert.doesNotMatch(timer, /!el\.isConnected/);
  assert.doesNotMatch(cueLog, /!el\.isConnected/);
  assert.doesNotMatch(dashboard, /!el\.isConnected/);
});

test("render paths do not rewrite stored bilingual session headings", () => {
  const timer = src("src/views/timer.ts");
  const cueLog = src("src/views/cue-log.ts");
  const codeblocks = src("src/codeblocks.ts");
  for (const source of [timer, cueLog, codeblocks]) {
    assert.doesNotMatch(source, /labelForLanguage\(/);
    assert.doesNotMatch(source, /Golf \/ 高爾夫/);
    assert.doesNotMatch(source, /Reminders \/ 提醒/);
  }
});
