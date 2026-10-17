import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  THEATER_CSS,
  THEATER_IDLE_MS,
  THEATER_PAGE_HEIGHT,
  THEATER_PAGE_WIDTH,
  isTheaterOn,
  mountTheater,
  resolveTheaterSurface,
  shouldSuppressControl,
} from "../src/reader/theater/index.ts";
import { collect, dispatch, manualClock, theaterHost } from "./reader-theater-host.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function mount(host, extra = {}) {
  const clock = extra.clock ?? manualClock();
  const handle = mountTheater({
    frame: host.frame,
    stage: host.stage,
    clock,
    ...extra,
    clock,
  });
  return { handle, clock };
}

test("theater rules lock XL and keep the page card", () => {
  assert.equal(THEATER_IDLE_MS, 2000);
  assert.equal(THEATER_PAGE_WIDTH, 340);
  assert.equal(THEATER_PAGE_HEIGHT, 500);
  assert.equal(resolveTheaterSurface("ob-window theme-light", null), "desk");
  assert.equal(resolveTheaterSurface("ob-phone-screen theme-dark", null), "phone");
  assert.equal(resolveTheaterSurface("workspace-leaf", "phone"), "phone");
  assert.equal(shouldSuppressControl({
    className: "atomic-page is-verso",
    testId: null,
    act: null,
  }), false);
  assert.equal(shouldSuppressControl({
    className: "atomic-selbar",
    testId: null,
    act: null,
  }), true);
  assert.equal(shouldSuppressControl({
    className: "atomic-btn",
    testId: "atomic-reader-highlight",
    act: "highlight",
  }), true);
  assert.equal(shouldSuppressControl({
    className: "th-exit",
    testId: "atomic-theater-exit",
    act: "theater-exit",
  }), false);
  assert.equal(shouldSuppressControl({
    className: "fitness-plugin atomic-reader-size",
    testId: "atomic-reader-size",
    act: null,
  }), true);
  assert.equal(shouldSuppressControl({
    className: "fitness-plugin atomic-reader-size-sheet",
    testId: "atomic-reader-size-sheet",
    act: null,
  }), true);
  assert.equal(shouldSuppressControl({
    className: "atomic-page atomic-reader-sized",
    testId: null,
    act: null,
  }), false);
});

test("stylesheet is linen in light, museum in dark, and stays on 1.5.0 tokens", () => {
  assert.match(THEATER_CSS, /#ebe8e2/);
  assert.match(THEATER_CSS, /#f0eee6/);
  assert.match(THEATER_CSS, /#f2efe9/);
  assert.match(THEATER_CSS, /#0e0c0a/);
  assert.match(THEATER_CSS, /#f0e8d2/);
  assert.match(THEATER_CSS, /Inter/);
  assert.match(THEATER_CSS, /Literata/);
  assert.match(THEATER_CSS, /14px/);
  assert.match(THEATER_CSS, /9px/);
  assert.match(THEATER_CSS, /3px/);
  assert.match(THEATER_CSS, /340px/);
  assert.match(THEATER_CSS, /500px/);
  assert.match(THEATER_CSS, /\.curtain/);
  assert.match(THEATER_CSS, /\.lamp-pool/);
  assert.doesNotMatch(THEATER_CSS, /sidew/);
  assert.doesNotMatch(THEATER_CSS, /purple|violet|#7c3aed|#a855f7|#6d28d9/i);
  assert.doesNotMatch(THEATER_CSS, /background:\s*(#000\b|#000000\b|black\b)/i);
  assert.doesNotMatch(THEATER_CSS, /!important/);
  assert.doesNotMatch(THEATER_CSS, /:has\(/);
  assert.doesNotMatch(THEATER_CSS, /clip-path\s*:/);
  assert.doesNotMatch(THEATER_CSS, /(?<![\w-])column-gap\s*:/);
  assert.doesNotMatch(THEATER_CSS, /(?<![\w-])column-count\s*:/);
  assert.doesNotMatch(THEATER_CSS, /-webkit-mask|(?:^|[^a-z-])mask(?:-|\s*:)/im);
  assert.doesNotMatch(THEATER_CSS, /\.atomic-page[^{]*display:\s*none/);
  assert.match(THEATER_CSS, /data-testid="atomic-reader-highlight"/);
  assert.match(THEATER_CSS, /data-testid="atomic-reader-size-sheet"/);
});

test("light desk theater is XL with an Exit Esc pill and no size control", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  const { handle } = mount(host);
  assert.equal(handle.active, true);
  assert.equal(handle.surface, "desk");
  assert.equal(isTheaterOn(host.frame), true);
  assert.equal(host.frame.classList.contains("theme-light"), true);
  assert.equal(host.frame.classList.contains("theme-dark"), false);
  assert.equal(host.frame.classList.contains("is-theater"), true);
  assert.equal(host.frame.classList.contains("sz-xl"), true);
  assert.equal(host.frame.classList.contains("is-chrome"), true);
  assert.equal(host.frame.getAttribute("data-atomic-theater-size"), "xl");
  assert.equal(host.frame.getAttribute("data-atomic-theater-surface"), "desk");
  assert.equal(host.frame.getAttribute("style"), null);
  assert.equal(handle.root.parentElement, host.stage);
  assert.notEqual(handle.root.parentElement, host.doc.body);

  const buttons = collect(handle.root, (node) => node.tagName === "BUTTON");
  assert.equal(buttons.length, 1);
  assert.equal(buttons[0].getAttribute("data-testid"), "atomic-theater-exit");
  assert.match(buttons[0].textContent, /Exit/);
  assert.match(buttons[0].textContent, /Esc/);
  assert.doesNotMatch(buttons[0].textContent, /S|M|L|XL/);
  assert.equal(collect(handle.root, (node) => node.classList.contains("bsize")).length, 0);
  assert.equal(collect(handle.root, (node) => node.classList.contains("curtain")).length, 2);
  assert.equal(host.page.hidden, false);
  assert.equal(host.recto.hidden, false);
  assert.equal(host.bar.hidden, true);
  assert.equal(host.foot.hidden, true);
  assert.equal(host.remark.hidden, true);
  assert.equal(host.highlight.hidden, true);
  assert.equal(host.ask.hidden, true);
  assert.equal(host.size.hidden, true);

  const style = host.doc.head.children.find((node) => node.tagName === "STYLE");
  assert.ok(style);
  assert.match(style.textContent, /#ebe8e2/);
  assert.match(style.textContent, /#0e0c0a/);
});

test("dark desk keeps the dark theme class and does not paint a light room inline", () => {
  const host = theaterHost({ theme: "dark", surface: "desk" });
  mount(host);
  assert.equal(host.frame.classList.contains("theme-dark"), true);
  assert.equal(host.frame.classList.contains("theme-light"), false);
  assert.equal(host.frame.getAttribute("style"), null);
  assert.equal(host.doc.documentElement.classList.contains("atomic-theater-dim"), true);
});

test("chrome hides after 2s and mouse or tap restores it", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  const clock = manualClock();
  const { handle } = mount(host, { clock });
  assert.equal(clock.pending, 1);
  assert.equal(host.frame.classList.contains("is-chrome"), true);
  assert.equal(host.doc.documentElement.classList.contains("atomic-theater-chrome"), true);

  dispatch(host.frame, "pointermove");
  assert.equal(clock.pending, 1);

  clock.fire();
  assert.equal(host.frame.classList.contains("is-chrome"), false);
  assert.equal(handle.exitButton.getAttribute("tabindex"), "-1");
  assert.equal(host.doc.documentElement.classList.contains("atomic-theater-chrome"), false);
  assert.equal(handle.active, true);

  dispatch(host.frame, "pointerdown");
  assert.equal(host.frame.classList.contains("is-chrome"), true);
  assert.equal(handle.exitButton.getAttribute("tabindex"), null);
  clock.fire();
  assert.equal(host.frame.classList.contains("is-chrome"), false);

  dispatch(host.frame, "pointermove");
  assert.equal(host.frame.classList.contains("is-chrome"), true);
});

test("Exit and Esc leave theater and destroy does not", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  const clock = manualClock();
  let exits = 0;
  const { handle } = mount(host, { clock, onExit: () => { exits += 1; } });
  dispatch(host.view, "keydown", { key: "+", metaKey: true, ctrlKey: true });
  assert.equal(handle.active, true);
  assert.equal(exits, 0);

  const escaped = dispatch(host.view, "keydown", { key: "Escape" });
  assert.equal(escaped.defaultPrevented, true);
  assert.equal(exits, 1);
  assert.equal(handle.active, false);
  assert.equal(isTheaterOn(host.frame), false);
  assert.equal(host.frame.classList.contains("is-theater"), false);
  assert.equal(host.frame.classList.contains("sz-xl"), false);
  assert.equal(host.page.hidden, false);
  assert.equal(host.highlight.hidden, false);
  assert.equal(host.size.hidden, false);
  assert.equal(host.doc.documentElement.classList.contains("atomic-theater-dim"), false);
  assert.equal(host.doc.head.children.some((node) => node.tagName === "STYLE"), false);
  clock.fireAll();
  assert.equal(exits, 1);

  const again = mount(host, { clock: manualClock(), onExit: () => { exits += 1; } });
  again.handle.exit();
  assert.equal(exits, 2);
  assert.equal(host.bar.hidden, false);

  const quiet = mount(host, { clock: manualClock(), onExit: () => { exits += 1; } });
  quiet.handle.destroy();
  assert.equal(exits, 2);
  assert.equal(quiet.handle.active, false);
  quiet.clock.fireAll();
  assert.equal(exits, 2);
});

test("a disconnected frame ends the session without calling onExit", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  const clock = manualClock();
  let exits = 0;
  const { handle } = mount(host, { clock, onExit: () => { exits += 1; } });
  host.frame.isConnected = false;
  assert.doesNotThrow(() => clock.fire());
  assert.equal(handle.active, false);
  assert.equal(exits, 0);
  assert.equal(host.frame.classList.contains("is-theater"), false);
});

test("phone keeps the page card, parks Exit below the island, and turns tools off", () => {
  const host = theaterHost({ theme: "light", surface: "phone" });
  const { handle } = mount(host);
  assert.equal(handle.surface, "phone");
  assert.equal(host.frame.getAttribute("data-atomic-theater-surface"), "phone");
  assert.equal(host.frame.getAttribute("data-atomic-theater-place"), "content");
  assert.equal(host.frame.getAttribute("data-atomic-theater-size"), "xl");
  assert.equal(host.page.hidden, false);
  assert.match(host.page.textContent, /Chapter I/);
  assert.equal(host.highlight.hidden, true);
  assert.equal(host.remarkBtn.hidden, true);
  assert.equal(host.ask.hidden, true);
  assert.equal(host.askSheet.hidden, true);
  assert.equal(host.size.hidden, true);
  assert.equal(host.gutter.hidden, true);
  assert.equal(host.remark.hidden, true);

  const island = host.frame.children.find((node) => node.classList.contains("ob-island"));
  const nav = host.frame.children.find((node) => node.classList.contains("ob-mnav"));
  const home = host.frame.children.find((node) => node.classList.contains("ob-home"));
  const status = host.frame.children.find((node) => node.classList.contains("ob-statusbar"));
  assert.equal(island.hidden, false);
  assert.equal(nav.hidden, false);
  assert.equal(home.hidden, false);
  assert.equal(status.hidden, false);
  assert.ok(host.frame.children.indexOf(island) < host.frame.children.indexOf(host.stage));
  assert.equal(host.stage.contains(handle.exitButton), true);
  assert.equal(island.contains(handle.exitButton), false);
  assert.equal(collect(handle.root, (node) => node.classList.contains("curtain")).every((node) => node.hidden), true);
  assert.equal(collect(handle.root, (node) => node.classList.contains("th-hint")).every((node) => node.hidden), true);
  assert.match(THEATER_CSS, /data-atomic-theater-place="content"\] \.th-chrome \{\s*top: 8px;/);
  assert.match(THEATER_CSS, /surface="phone"\] \.th-chrome \{\s*top: 58px;/);

  const buttons = collect(handle.root, (node) => node.tagName === "BUTTON");
  assert.deepEqual(buttons.map((node) => node.textContent), ["ExitEsc"]);
});

test("phone screen stage clears the island when the content pane is the screen", () => {
  const host = theaterHost({ theme: "dark", surface: "phone" });
  mountTheater({
    frame: host.frame,
    stage: host.frame,
    surface: "phone",
    clock: manualClock(),
  });
  assert.equal(host.frame.classList.contains("theme-dark"), true);
  assert.equal(host.frame.getAttribute("data-atomic-theater-place"), "screen");
});

test("reduced motion marks the frame and still arms the idle hide", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  host.view.reduced = true;
  const clock = manualClock();
  mount(host, { clock });
  assert.equal(host.frame.classList.contains("is-reduced"), true);
  assert.equal(host.doc.documentElement.classList.contains("is-reduced"), true);
  assert.equal(clock.pending, 1);
  assert.match(THEATER_CSS, /prefers-reduced-motion:\s*reduce/);
  assert.match(THEATER_CSS, /\.is-reduced\.is-theater \.th-chrome/);
});

test("a shell stage on document.body receives the room", () => {
  const host = theaterHost({ theme: "light", surface: "desk" });
  const { handle } = mount(host, { stage: host.doc.body });
  assert.equal(handle.root.parentElement, host.doc.body);
  assert.equal(handle.root.getAttribute("data-testid"), "atomic-theater");
});

test("theater source does not reach for globalThis or a second shell", () => {
  const dir = join(root, "src/reader/theater");
  for (const name of ["rules.ts", "styles.ts", "mount.ts", "index.ts"]) {
    const text = readFileSync(join(dir, name), "utf8");
    assert.doesNotMatch(text, /\bglobalThis\b/);
    assert.doesNotMatch(text, /innerHTML|outerHTML|insertAdjacentHTML/);
    assert.doesNotMatch(text, /requestFullscreen/);
    assert.doesNotMatch(text, /\.style\.setProperty\(\s*["'][^"']+["']\s*,\s*["']/);
  }
});
