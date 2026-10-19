/**
 * Live shots for the reader hero.
 *
 * Habit frames use the daily-note capture. Flight, the settled reader, Ask,
 * canvas, and theater come from the running plugin. The page is fixed at XL
 * (22 lines). There is no size control and no shortcut.
 *
 * Point ATOMIC_PLUGIN_ROOT at the finished reader build. This script does not
 * push that build, and it does not write a video into the repo.
 *
 * Run: ATOMIC_PLUGIN_ROOT=/tmp/reader-live node scripts/capture-reader-hero.mjs
 */
import { spawnSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  hideCaptureScrollbars,
  hideNoteProperties,
  openPreviewNote,
  parkMouse,
  resizeWindow,
} from "./docs-capture.mjs";
import { capturePreviewCrop, frameHeroContent, heroHoleSize } from "./hero-frames.mjs";
import { DEFAULT_DEMO_VAULT } from "./hero-capture-options.mjs";
import {
  attachSelenium,
  dismissTrustDialog,
  e2eSkipReason,
  launchObsidian,
  saveScreenshot,
  sleep,
  stopSession,
  switchToObsidianWindow,
  waitCss,
  waitForPlugin,
} from "../e2e/lib/obsidian.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const PLUGIN_ROOT = process.env.ATOMIC_PLUGIN_ROOT || ROOT;
const VAULT = process.env.VAULT_PATH || "/tmp/atomic-reader-hero-vault";
const SHOT_DIR = process.env.ATOMIC_READER_HERO_SHOTS || "/tmp/atomic-reader-hero-shots";
const DAILY = "Daily notes/2026-08-11.md";
const BOOK_TITLE = "The Unhurried Advantage";
const NOTE = `atomics/hobbies/Reading/Items/${BOOK_TITLE}.md`;
const EPUB = `atomics/hobbies/Reading/Items/${BOOK_TITLE}.epub`;
const CANVAS = `atomics/hobbies/Reading/Items/${BOOK_TITLE}.canvas`;
const SECRET_NAME = "atomic-ask";

const HIDE_CHROME = `
.workspace-ribbon,
.workspace-split.mod-left-split,
.workspace-split.mod-right-split,
.status-bar,
.titlebar,
.titlebar-button-container,
.view-header,
.workspace-tab-header-container,
.metadata-container,
.notice,
.tooltip {
  display: none !important;
}
.markdown-preview-view,
.atomic-reader-spread,
.canvas-wrapper,
.view-content {
  overflow: hidden !important;
}
.fitness-plugin .atomic-book-row-books,
.fitness-plugin .fitness-heatmap-scroll,
.fitness-plugin .atomic-book-shelf-row {
  overflow: hidden !important;
}
`;

function run(command, args, cwd = ROOT) {
  const result = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${(result.stderr || result.stdout || "").trim()}`);
  }
  if (result.stdout) console.log(result.stdout.trim());
}

function readJson(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function storedZip(files) {
  const encoder = new TextEncoder();
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const file of files) {
    const name = encoder.encode(file.name);
    const data = file.data;
    const local = new Uint8Array(30 + name.byteLength + data.byteLength);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint32(18, data.byteLength, true);
    localView.setUint32(22, data.byteLength, true);
    localView.setUint16(26, name.byteLength, true);
    local.set(name, 30);
    local.set(data, 30 + name.byteLength);
    locals.push(local);
    const central = new Uint8Array(46 + name.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint32(20, data.byteLength, true);
    centralView.setUint32(24, data.byteLength, true);
    centralView.setUint16(28, name.byteLength, true);
    centralView.setUint32(42, offset, true);
    central.set(name, 46);
    centrals.push(central);
    offset += local.byteLength;
  }
  const centralSize = centrals.reduce((sum, part) => sum + part.byteLength, 0);
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(8, files.length, true);
  eocdView.setUint16(10, files.length, true);
  eocdView.setUint32(12, centralSize, true);
  eocdView.setUint32(16, offset, true);
  const out = new Uint8Array(offset + centralSize + eocd.byteLength);
  let cursor = 0;
  for (const part of [...locals, ...centrals, eocd]) {
    out.set(part, cursor);
    cursor += part.byteLength;
  }
  return out;
}

function epubBytes() {
  const encoder = new TextEncoder();
  const chapter = encoder.encode(`<?xml version="1.0"?>
<html xmlns="http://www.w3.org/1999/xhtml"><body>
<h1>Chapter 1</h1>
<p>The morning stayed quiet long enough to open the book. A page is a small room, and the habit is walking into it before the rest of the day arrives.</p>
<p>She kept the pencil in the gutter, not because the sentence was finished, but because she wanted to find it again without hunting through the chapter.</p>
<p>The margin keeps the sentence I want to find again. It sits beside the line, the way a bookmark sits in a pocket, and it does not change the type on the page.</p>
<p>Ask is a question aimed at this page, this selection, or the whole book. The key stays in secret storage on this computer. The note keeps the name of the secret, never the secret itself.</p>
<p>One canvas belongs to the book. The first remark draws the card, and the book note points at that file so the next question lands in the same place.</p>
<p>Theater is the room around the page. Light mode hangs linen. Dark mode keeps the museum. The page stays at one size, and the only control is the way out.</p>
<p>When the hour was up she closed the cover and the minutes stayed on the note. Tomorrow the same page would be waiting, with the margin card still beside it.</p>
</body></html>`);
  const opf = encoder.encode(`<?xml version="1.0"?>
<package>
  <manifest>
    <item id="c1" href="chapter.xhtml" media-type="application/xhtml+xml"/>
  </manifest>
  <spine><itemref idref="c1"/></spine>
</package>`);
  const container = encoder.encode(
    `<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>`,
  );
  return storedZip([
    { name: "mimetype", data: encoder.encode("application/epub+zip") },
    { name: "META-INF/container.xml", data: container },
    { name: "OEBPS/content.opf", data: opf },
    { name: "OEBPS/chapter.xhtml", data: chapter },
  ]);
}

function seedVault(bookLimit) {
  run(process.execPath, [
    join(ROOT, "scripts/seed-readme-demo-vault.mjs"),
    "--vault",
    VAULT,
    "--book-limit",
    String(bookLimit),
  ]);
}

function installPlugin() {
  const bundle = readFileSync(join(PLUGIN_ROOT, "main.js"), "utf8");
  if (!bundle.includes("atomic-reader")) {
    throw new Error(
      `${PLUGIN_ROOT}/main.js has no reader. Set ATOMIC_PLUGIN_ROOT to a local combine of the reader drafts.`,
    );
  }
  const pluginDir = join(VAULT, ".obsidian/plugins/atomic-tracker");
  mkdirSync(pluginDir, { recursive: true });
  for (const file of ["main.js", "manifest.json", "styles.css"]) {
    copyFileSync(join(PLUGIN_ROOT, file), join(pluginDir, file));
  }
  const fontsSrc = join(PLUGIN_ROOT, "fonts");
  if (existsSync(fontsSrc)) {
    const fontsDest = join(pluginDir, "fonts");
    mkdirSync(fontsDest, { recursive: true });
    for (const name of readdirSync(fontsSrc)) {
      if (!name.endsWith(".woff2")) continue;
      copyFileSync(join(fontsSrc, name), join(fontsDest, name));
    }
  }
  const dataPath = join(pluginDir, "data.json");
  const data = readJson(dataPath);
  data.ask = {
    provider: "openai",
    model: "gpt-4.1-mini",
    secretName: SECRET_NAME,
    baseUrl: "",
  };
  data.reader = {
    defaultOpen: "chooser",
    theater: false,
    enabled: true,
  };
  writeJson(dataPath, data);
}

function installMinimalTheme() {
  const dest = join(VAULT, ".obsidian/themes/Minimal");
  mkdirSync(dest, { recursive: true });
  if (existsSync(join(dest, "theme.css")) && existsSync(join(dest, "manifest.json"))) return;
  const tmp = "/tmp/obsidian-minimal";
  if (!existsSync(join(tmp, "theme.css"))) {
    run("git", ["clone", "--depth", "1", "https://github.com/kepano/obsidian-minimal.git", tmp]);
  }
  copyFileSync(join(tmp, "theme.css"), join(dest, "theme.css"));
  copyFileSync(join(tmp, "manifest.json"), join(dest, "manifest.json"));
}

function patchAppearance() {
  const snippetDir = join(VAULT, ".obsidian/snippets");
  mkdirSync(snippetDir, { recursive: true });
  writeFileSync(join(snippetDir, "hero-note-only.css"), HIDE_CHROME);
  const appPath = join(VAULT, ".obsidian/app.json");
  const app = readJson(appPath);
  app.readableLineLength = false;
  app.livePreview = true;
  app.baseFontSize = 15;
  app.theme = "moonstone";
  app.propertiesInDocument = "hidden";
  writeJson(appPath, app);
  const appearancePath = join(VAULT, ".obsidian/appearance.json");
  const appearance = readJson(appearancePath);
  appearance.theme = "moonstone";
  appearance.cssTheme = "Minimal";
  appearance.showRibbon = false;
  appearance.enabledCssSnippets = ["hero-note-only"];
  writeJson(appearancePath, appearance);
  const corePath = join(VAULT, ".obsidian/core-plugins.json");
  const core = readJson(corePath);
  core.canvas = true;
  writeJson(corePath, core);
}

function attachBook() {
  const notePath = join(VAULT, NOTE);
  const note = readFileSync(notePath, "utf8");
  const next = note
    .replace(/^related_canvas:\s*$/m, `related_canvas: "${CANVAS}"`)
    .replace(/^spine_color:\s*$/m, `spine_color:\nsource: "${EPUB}"\nreader.page: 2`);
  if (!next.includes(`related_canvas: "${CANVAS}"`) || !next.includes(`source: "${EPUB}"`)) {
    throw new Error("book note frontmatter was not patched");
  }
  if (next.includes("reader.size")) {
    throw new Error("book note still writes a page size");
  }
  writeFileSync(notePath, next);
  writeFileSync(join(VAULT, EPUB), epubBytes());
}

function prepareVault(bookLimit) {
  seedVault(bookLimit);
  installPlugin();
  installMinimalTheme();
  patchAppearance();
  attachBook();
}

async function cropSelector(driver, selector, dest) {
  const box = await driver.executeScript(
    `
    const selector = arguments[0];
    const el = document.querySelector(selector);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    };
    `,
    selector,
  );
  if (!box || box.width < 20 || box.height < 20) {
    throw new Error(`missing ${selector} for ${dest}`);
  }
  const full = await saveScreenshot(driver, `reader-hero-${Date.now()}`);
  mkdirSync(dirname(dest), { recursive: true });
  run("python3", [
    join(ROOT, "scripts/crop-image-rect.py"),
    "--src",
    full,
    "--out",
    dest,
    "--x",
    String(box.x),
    "--y",
    String(box.y),
    "--width",
    String(box.width),
    "--height",
    String(box.height),
    "--viewport-width",
    String(box.viewportWidth),
    "--viewport-height",
    String(box.viewportHeight),
  ]);
  return dest;
}

async function openFlight(driver) {
  const flight = await driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    const title = arguments[0];
    const originalMatch = window.matchMedia.bind(window);
    window.matchMedia = (query) => {
      const text = String(query);
      if (text.includes("prefers-reduced-motion")) {
        return {
          matches: false,
          media: text,
          addListener() {},
          removeListener() {},
          addEventListener() {},
          removeEventListener() {},
          dispatchEvent() { return false; },
        };
      }
      return originalMatch(query);
    };
    const books = [...document.querySelectorAll('[data-testid="atomic-book"]')];
    const book = books.find((el) => (el.textContent || "").includes(title));
    if (!book) {
      done({ ok: false, reason: "missing-book" });
      return;
    }
    book.scrollIntoView({ block: "nearest", inline: "nearest" });
    const started = Date.now();
    const finish = (overlay) => {
      const nodes = [overlay, ...overlay.querySelectorAll("*")];
      for (const node of nodes) node.style.setProperty("animation-play-state", "paused", "important");
      done({
        ok: true,
        host: overlay.getAttribute("data-overlay-host") || "",
        title: overlay.querySelector(".atomic-flight-title")?.textContent || "",
        text: (overlay.innerText || "").slice(0, 400),
        parent: overlay.parentElement?.tagName || "",
      });
    };
    const watch = () => {
      const overlay = document.querySelector('[data-testid="atomic-open-flight"]');
      if (overlay) {
        window.setTimeout(() => finish(overlay), 220);
        return;
      }
      if (Date.now() - started > 8000) {
        done({
          ok: false,
          reason: "no-overlay",
          reader: Boolean(document.querySelector('[data-testid="atomic-reader"]')),
          chooser: Boolean(document.querySelector('[data-testid="atomic-chooser"]')),
          book: Boolean(document.querySelector('[data-testid="atomic-chooser-book"]')),
        });
        return;
      }
      window.requestAnimationFrame(watch);
    };
    book.click();
    window.setTimeout(() => {
      if (!document.querySelector('[data-testid="atomic-chooser"]')) book.click();
      const arm = () => {
        const button = document.querySelector('[data-testid="atomic-chooser-book"]');
        if (!button) {
          if (Date.now() - started > 8000) {
            done({
              ok: false,
              reason: "no-open-book",
              chooser: Boolean(document.querySelector('[data-testid="atomic-chooser"]')),
            });
            return;
          }
          window.setTimeout(arm, 40);
          return;
        }
        watch();
        button.click();
      };
      arm();
    }, 180);
  `, BOOK_TITLE);
  if (!flight?.ok) throw new Error(`Open Book flight did not start: ${JSON.stringify(flight)}`);
  if (flight.host !== "leaf" || flight.parent === "BODY") {
    throw new Error(`flight overlay was not on the reader leaf: ${JSON.stringify(flight)}`);
  }
  if (/pride and prejudice|netherfield|bennet/i.test(flight.text)) {
    throw new Error(`flight still painted the Pride and Prejudice fixture: ${flight.text}`);
  }
  if (!flight.title.includes("Unhurried")) {
    throw new Error(`flight cover title was ${flight.title || "empty"}`);
  }
  console.log(`flight ${JSON.stringify(flight)}`);
  return flight;
}

async function dismissFlight(driver) {
  await driver.executeScript(`
    document.querySelector('[data-testid="atomic-open-flight"]')?.remove();
  `);
}

async function openReader(driver) {
  const opened = await driver.executeAsyncScript(
    `
    const done = arguments[arguments.length - 1];
    const notePath = arguments[0];
    const filePath = arguments[1];
    const title = arguments[2];
    const leaf = app.workspace.getLeaf(false);
    leaf.setViewState({
      type: "atomic-reader",
      active: true,
      state: {
        notePath,
        filePath,
        title,
        kind: "epub",
        returnPath: arguments[3],
      },
    }).then(() => done(true), (error) => done(String(error)));
    `,
    NOTE,
    EPUB,
    BOOK_TITLE,
    DAILY,
  );
  if (opened !== true) throw new Error(`reader did not open: ${opened}`);
  await sleep(700);
}

async function readerState(driver) {
  return driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader"]')
      || document.querySelector('[data-testid="atomic-reader"]');
    if (!root) return null;
    const pages = [...root.querySelectorAll('[data-testid="atomic-reader-page"] p')].map((node) => node.textContent || "");
    return {
      kind: root.getAttribute("data-kind"),
      page: root.getAttribute("data-page"),
      total: root.getAttribute("data-total"),
      size: root.getAttribute("data-size"),
      status: root.querySelector('[data-testid="atomic-reader-status"]')?.getAttribute("data-state") || "",
      text: pages.join(" ").slice(0, 240),
      remark: Boolean(root.querySelector('[data-testid="atomic-remark"]')),
      phone: root.classList.contains("is-phone"),
      bodyLines: root.getAttribute("data-body-lines") || "",
      sizeBar: Boolean(root.querySelector('[data-reader-slot="size"] > [data-testid="atomic-reader-size"]')),
      sizeSheet: Boolean(root.querySelector('[data-testid="atomic-reader-size-sheet"]')),
      sizeSlot: root.querySelector('[data-reader-slot="size"]')?.innerHTML?.slice(0, 240) || "",
      sizeCount: document.querySelectorAll('[data-testid="atomic-reader-size"]').length,
      readers: document.querySelectorAll('[data-testid="atomic-reader"]').length,
    };
  `);
}

async function waitForReader(driver, phone) {
  const start = Date.now();
  let state = null;
  while (Date.now() - start < 20000) {
    state = await readerState(driver);
    const sized = state?.sizeBar || state?.sizeSheet || state?.sizeCount;
    if (state?.text && !state.status && !sized && state.size === "xl" && state.bodyLines === "22") break;
    await sleep(300);
  }
  const sized = state?.sizeBar || state?.sizeSheet || state?.sizeCount;
  if (!state?.text || state.status || sized) {
    throw new Error(`reader was not ready: ${JSON.stringify(state)}`);
  }
  if (/pride and prejudice/i.test(state.text)) {
    throw new Error("reader painted the Pride and Prejudice fixture");
  }
  if (state.size !== "xl" || state.bodyLines !== "22") {
    throw new Error(`settled page box was ${state.size} / ${state.bodyLines} lines`);
  }
  if (Boolean(phone) !== Boolean(state.phone)) {
    throw new Error(`reader phone layout was ${state.phone}, expected ${Boolean(phone)}`);
  }
  console.log(`reader ${JSON.stringify(state)}`);
  return state;
}

async function openAsk(driver) {
  const box = await driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader"]');
    const page = [...(root?.querySelectorAll('[data-testid="atomic-reader-page"] p') || [])]
      .find((node) => (node.textContent || "").trim());
    if (!page || !root) return null;
    const rect = page.getBoundingClientRect();
    return {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
      text: (page.textContent || "").trim().slice(0, 80),
      listen: root.getAttribute("data-ask-listen") || "",
    };
  `);
  if (!box?.text) throw new Error(`could not find reader text (${JSON.stringify(box)})`);
  const selected = await driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader"]');
    const page = root?.querySelector(".atomic-reader-page.is-recto p")
      || root?.querySelector('[data-testid="atomic-reader-page"] p');
    if (!page) return { ok: false, reason: "no-paragraph" };
    const range = page.ownerDocument.createRange();
    range.selectNodeContents(page);
    const view = page.ownerDocument.defaultView;
    const selection = view.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
    page.dispatchEvent(new MouseEvent("mouseup", { bubbles: true }));
    return {
      ok: selection.toString().trim().length > 0,
      text: selection.toString().trim().slice(0, 60),
    };
  `);
  if (!selected?.ok) throw new Error(`could not select reader text (${JSON.stringify({ box, selected })})`);
  await sleep(500);
  const bar = await driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader"]');
    const buttons = [...(root?.querySelectorAll('[data-testid="atomic-selbar"] button') || [])];
    const ask = buttons.find((button) => (button.textContent || "").trim() === "Ask");
    return {
      bar: buttons.length > 0,
      ask: Boolean(ask),
      label: ask?.textContent || "",
    };
  `);
  if (!bar?.ask) throw new Error(`Ask selection bar did not open (${JSON.stringify({ selected, bar })})`);
  await driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader"]');
    const ask = [...(root?.querySelectorAll('[data-testid="atomic-selbar"] button') || [])]
      .find((button) => (button.textContent || "").trim() === "Ask");
    ask?.click();
  `);
  await waitCss(driver, '[data-testid="atomic-ask"]');
  const title = await driver.executeScript(`
    return document.querySelector('[data-testid="atomic-ask"] h4')?.textContent || "";
  `);
  if (title !== "Ask · BYO key") throw new Error(`ask title was ${title || "empty"}`);
  await sleep(250);
}

async function openCanvas(driver) {
  const opened = await driver.executeAsyncScript(`
    const done = arguments[arguments.length - 1];
    const plugin = app.internalPlugins.getPluginById("canvas");
    if (plugin && !plugin.enabled) plugin.enable();
    const button = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-reader-canvas"]');
    if (!button) {
      done("missing-button");
      return;
    }
    button.click();
    const started = Date.now();
    const watch = () => {
      const nodes = document.querySelectorAll(".canvas-node").length;
      const labels = [...document.querySelectorAll(".canvas-node")].map((node) => (node.textContent || "").replace(/\\s+/g, " ").trim()).join(" | ");
      if (nodes > 3 && /Opening/.test(labels) && /Ask thread/.test(labels)) {
        done("ok");
        return;
      }
      if (Date.now() - started > 8000) {
        done("timeout:" + nodes + ":" + labels.slice(0, 240));
        return;
      }
      window.setTimeout(watch, 200);
    };
    window.setTimeout(watch, 400);
  `);
  if (opened !== "ok") throw new Error(`canvas did not open: ${opened}`);
  await driver.executeScript(`
    const canvas = app.workspace.activeLeaf?.view?.canvas;
    if (canvas?.zoomToFit) canvas.zoomToFit();
  `);
  await sleep(400);
}

async function openTheater(driver) {
  await driver.executeScript(`
    document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-theater-enter"]')?.click();
  `);
  await waitCss(driver, ".workspace-leaf.mod-active .atomic-theater-root.is-theater");
  await driver.executeScript(`
    document.querySelector(".workspace-leaf.mod-active .atomic-theater-root")?.dispatchEvent(
      new PointerEvent("pointermove", { bubbles: true, clientX: 40, clientY: 40 }),
    );
  `);
  await sleep(250);
  const exit = await driver.executeScript(`
    const button = document.querySelector('.workspace-leaf.mod-active [data-testid="atomic-theater-exit"]');
    return button ? button.textContent : "";
  `);
  if (!exit) throw new Error("theater Exit control was missing");
  const height = await driver.executeScript(`
    const root = document.querySelector('.workspace-leaf.mod-active .atomic-theater-root.is-theater');
    const pages = [...(root?.querySelectorAll(".atomic-reader-page") || [])];
    const boxes = pages.map((page) => Math.round(page.getBoundingClientRect().height));
    const style = root ? getComputedStyle(root).getPropertyValue("--page-h").trim() : "";
    return { boxes, style, theater: Boolean(root) };
  `);
  const tallest = Math.max(0, ...(height.boxes || []));
  if (tallest !== 500 && height.style !== "500px") {
    throw new Error(`theater page height was ${JSON.stringify(height)}, expected 500`);
  }
}

async function storeAskSecret(driver) {
  await driver.executeScript(
    `
    const name = arguments[0];
    const storage = app.secretStorage;
    if (!storage?.setSecret) return;
    storage.setSecret(name, "capture-only-not-a-provider-key");
    `,
    SECRET_NAME,
  );
}

async function captureDaily(driver, dest) {
  await openPreviewNote(driver, DAILY);
  await waitCss(driver, '[data-testid="atomic-bookshelf"]');
  const start = Date.now();
  let loaded = 0;
  while (Date.now() - start < 20000) {
    loaded = await driver.executeScript(`
      return [...document.querySelectorAll("img.atomic-book-cover")]
        .filter((img) => img.complete && img.naturalWidth > 40).length;
    `);
    if (loaded >= 2) break;
    await sleep(300);
  }
  if (loaded < 2) throw new Error(`covers not ready (${loaded})`);
  await hideNoteProperties(driver);
  await hideCaptureScrollbars(driver, HIDE_CHROME);
  await parkMouse(driver);
  await sleep(400);
  await capturePreviewCrop(driver, dest);
}

async function captureScene(driver, scene, dest) {
  await hideCaptureScrollbars(driver, HIDE_CHROME);
  if (scene !== "flight" && scene !== "ask" && scene !== "theater") await parkMouse(driver);
  if (scene === "theater") {
    await driver.executeScript(`
      document.querySelector(".workspace-leaf.mod-active .atomic-theater-root")?.dispatchEvent(
        new PointerEvent("pointermove", { bubbles: true, clientX: 80, clientY: 24 }),
      );
    `);
    await sleep(150);
  }
  const selector = ".workspace-leaf.mod-active .view-content";
  await cropSelector(driver, selector, dest);
}

async function capturePass(kind) {
  const phone = kind === "phone";
  const size = heroHoleSize("daily", phone ? "phone" : "desktop");
  const dailySize = phone ? size : { width: 1560, height: 1100 };
  prepareVault(phone ? 3 : 12);
  const launched = await launchObsidian(VAULT, DAILY);
  const driver = await attachSelenium(undefined, launched.version);
  try {
    await switchToObsidianWindow(driver);
    await waitForPlugin(driver);
    await dismissTrustDialog(driver);
    await storeAskSecret(driver);
    await resizeWindow(driver, dailySize.width, dailySize.height);
    await captureDaily(driver, join(SHOT_DIR, `habits-${kind}.png`));
    console.log(`saved habits-${kind}`);

    await resizeWindow(driver, size.width, size.height);
    await sleep(300);
    await openFlight(driver);
    await captureScene(driver, "flight", join(SHOT_DIR, `flight-${kind}.png`));
    console.log(`saved flight-${kind}`);
    await dismissFlight(driver);

    await openReader(driver);
    await waitForReader(driver, phone);
    await captureScene(driver, "reader", join(SHOT_DIR, `reader-${kind}.png`));
    console.log(`saved reader-${kind}`);

    await openAsk(driver);
    await captureScene(driver, "ask", join(SHOT_DIR, `ask-${kind}.png`));
    console.log(`saved ask-${kind}`);

    await openCanvas(driver);
    await captureScene(driver, "canvas", join(SHOT_DIR, `canvas-${kind}.png`));
    console.log(`saved canvas-${kind}`);

    if (!phone) {
      await openReader(driver);
      await waitForReader(driver, phone);
      await openTheater(driver);
      await captureScene(driver, "theater", join(SHOT_DIR, "theater-desktop.png"));
      console.log("saved theater-desktop");
    }
  } finally {
    await stopSession({ driver });
  }
}

function frameShots() {
  const framed = join(SHOT_DIR, "framed");
  mkdirSync(framed, { recursive: true });
  for (const scene of ["habits", "flight", "reader", "ask", "canvas"]) {
    frameHeroContent({
      scene: "daily",
      kind: "desktop",
      content: join(SHOT_DIR, `${scene}-desktop.png`),
      out: join(framed, `${scene}-desktop.png`),
    });
    frameHeroContent({
      scene: "daily",
      kind: "phone",
      content: join(SHOT_DIR, `${scene}-phone.png`),
      out: join(framed, `${scene}-phone.png`),
    });
  }
  run("python3", [join(ROOT, "scripts/compose-reader-hero.py"), "--shots", SHOT_DIR]);
}

async function main() {
  const skip = e2eSkipReason();
  if (skip) throw new Error(`Cannot capture the reader hero: ${skip}`);
  if (DEFAULT_DEMO_VAULT === VAULT) {
    throw new Error("refusing to reuse the default demo vault for the reader capture");
  }
  mkdirSync(SHOT_DIR, { recursive: true });
  await capturePass("desktop");
  await capturePass("phone");
  frameShots();
}

await main();
