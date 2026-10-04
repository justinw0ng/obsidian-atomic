import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ATOMIC_BLOCK_HOST_CLASS,
  ATOMIC_BLOCK_PENDING_BAR_CLASS,
  ATOMIC_BLOCK_PENDING_CLASS,
  beginBlockRender,
  enqueueBlockRender,
  invalidateBlockRenderIfCurrent,
  isStaleBlockRender,
  mountAtomicBlockShell,
} from "../src/util/block-render.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const styles = readFileSync(join(root, "styles.css"), "utf8");
const mainSrc = readFileSync(join(root, "src/main.ts"), "utf8");
const codeblocksSrc = readFileSync(join(root, "src/codeblocks.ts"), "utf8");

function createHost() {
  /** @type {any[]} */
  const children = [];
  const host = {
    children,
    cls: "",
    emptied: false,
    empty() {
      this.emptied = true;
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

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

test("mountAtomicBlockShell empties the host and adds pending classes", () => {
  const host = createHost();
  host.createDiv({ cls: "stale-source" });
  const root = mountAtomicBlockShell(host);
  assert.equal(host.emptied, true);
  assert.match(host.cls, new RegExp(ATOMIC_BLOCK_HOST_CLASS));
  assert.equal(root.cls, ATOMIC_BLOCK_PENDING_CLASS);
  assert.equal(host.children.length, 1);
  assert.equal(host.children[0], root);
  assert.equal(root.children.length, 1);
  assert.equal(root.children[0].cls, ATOMIC_BLOCK_PENDING_BAR_CLASS);
});

test("beginBlockRender increments and isStaleBlockRender detects superseded renders", () => {
  const el = {};
  const first = beginBlockRender(el);
  const second = beginBlockRender(el);
  assert.equal(isStaleBlockRender(el, first), true);
  assert.equal(isStaleBlockRender(el, second), false);
});

test("reading mode does not keep the pending bar on a detached host", () => {
  const host = createHost();
  host.isConnected = false;
  mountAtomicBlockShell(host);
  assert.equal(host.children[0]?.cls, ATOMIC_BLOCK_PENDING_CLASS);

  const generation = beginBlockRender(host);
  if (isStaleBlockRender(host, generation)) return;
  host.empty();
  host.createDiv({ cls: "fitness-plugin atomic-timer atomic-well" });

  assert.equal(
    host.children.some((child) => child.cls === ATOMIC_BLOCK_PENDING_CLASS),
    false,
    "pending placeholder must be replaced after the first paint commit",
  );
  assert.equal(host.children.length, 1);
  assert.match(host.children[0].cls, /atomic-timer/);
  assert.equal(host.isConnected, false);
  assert.equal(isStaleBlockRender(host), false);
  beginBlockRender(host);
  assert.equal(isStaleBlockRender(host, generation), true);
});

test("async session widgets commit paint without an isConnected gate", () => {
  const timer = readFileSync(join(root, "src/views/timer.ts"), "utf8");
  const cueLog = readFileSync(join(root, "src/views/cue-log.ts"), "utf8");
  const dashboard = readFileSync(join(root, "src/views/dashboard.ts"), "utf8");
  const today = readFileSync(join(root, "src/views/today.ts"), "utf8");
  for (const source of [timer, cueLog, today]) {
    assert.match(source, /isStaleBlockRender\(el, generation\)/);
  }
  assert.doesNotMatch(timer, /!el\.isConnected/);
  assert.doesNotMatch(cueLog, /!el\.isConnected/);
  assert.doesNotMatch(dashboard, /!el\.isConnected/);
});

test("render paths do not rewrite stored bilingual session headings", () => {
  const timer = readFileSync(join(root, "src/views/timer.ts"), "utf8");
  const cueLog = readFileSync(join(root, "src/views/cue-log.ts"), "utf8");
  const codeblocks = readFileSync(join(root, "src/codeblocks.ts"), "utf8");
  for (const source of [timer, cueLog, codeblocks]) {
    assert.doesNotMatch(source, /labelForLanguage\(/);
    assert.doesNotMatch(source, /Golf \/ 高爾夫/);
    assert.doesNotMatch(source, /Reminders \/ 提醒/);
  }
});

test("enqueueBlockRender skips a stale queued render", async () => {
  const el = {};
  const order = [];
  const first = enqueueBlockRender(el, async (generation) => {
    await delay(20);
    if (isStaleBlockRender(el, generation)) return;
    order.push("first");
  });
  const second = enqueueBlockRender(el, async (generation) => {
    if (isStaleBlockRender(el, generation)) return;
    order.push("second");
  });
  await Promise.all([first, second]);
  assert.deepEqual(order, ["second"]);
});

test("invalidateBlockRenderIfCurrent only bumps when that generation is still current", () => {
  const el = {};
  const first = beginBlockRender(el);
  invalidateBlockRenderIfCurrent(el, first);
  assert.equal(isStaleBlockRender(el, first), true);

  const second = beginBlockRender(el);
  const third = beginBlockRender(el);
  invalidateBlockRenderIfCurrent(el, second);
  assert.equal(isStaleBlockRender(el, third), false);
});

test("styles hide unprocessed atomic fences and style the pending shell", () => {
  assert.match(styles, /\.fitness-plugin\.atomic-block-pending/);
  assert.match(styles, /\.atomic-block-pending-bar/);
  assert.match(styles, /pre\[class\*="language-atomic-"\]:not\(\.atomic-block-host\)/);
  assert.doesNotMatch(styles, /:has\(/);
  assert.match(
    styles,
    /@media\s*\(prefers-reduced-motion:\s*reduce\)[\s\S]*\.atomic-block-pending-bar[\s\S]*animation:\s*none/,
  );
});

test("onload registers codeblocks before awaiting loadSettings", () => {
  const onload = mainSrc.slice(mainSrc.indexOf("async onload()"));
  const registerAt = onload.indexOf("registerCodeblocks(this)");
  const loadAt = onload.indexOf("await this.loadSettings()");
  assert.ok(registerAt >= 0, "registerCodeblocks missing from onload");
  assert.ok(loadAt >= 0, "loadSettings missing from onload");
  assert.ok(registerAt < loadAt);
  assert.match(onload, /this\.scheduleRefresh\(\)/);
});

test("codeblock processor returns void without awaiting renderBlock", () => {
  assert.match(codeblocksSrc, /registerMarkdownCodeBlockProcessor/);
  assert.doesNotMatch(
    codeblocksSrc,
    /async\s*\(source,\s*el,\s*ctx\)\s*=>\s*\{[\s\S]*await renderBlock/,
  );
  assert.match(codeblocksSrc, /enqueueBlockRender/);
  assert.match(codeblocksSrc, /invalidateBlockRenderIfCurrent/);
});
