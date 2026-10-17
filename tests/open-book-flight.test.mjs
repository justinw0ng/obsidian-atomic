import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  COVER_OPEN_MS,
  DESKTOP_BOOK_PX,
  FLIGHT_EASE,
  FLIGHT_MS,
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  OPEN_BOOK_HINT,
  PHONE_BOOK_PX,
  flightOverlayBody,
  flightVars,
  mountOpenBookFlight,
  openBookFlightView,
  playOpenBookFlight,
  registerOpenBookFlight,
  resolveFlightLayout,
  resolveFlightMotion,
  safeCoverColor,
  spreadFromPainted,
  unionBoxes,
} from "../src/reader/flight/index.ts";
import { OPEN_BOOK_FLIGHT_CSS } from "../src/reader/flight/styles.ts";
import { readerMounts, resetReaderMounts } from "../src/reader/shell/mount.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const flightDir = join(root, "src/reader/flight");

/** Pride and Prejudice, the page the approved journey lands on. Unit fixture only. */
const JOURNEY_LANDING_PAGE = {
  page: 47,
  headingLeft: "Chapter I",
  headingRight: "p. 47",
  left: [
    "It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.",
    "However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.",
    "“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”",
    "Mr. Bennet replied that he had not.",
  ],
  right: [
    "“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”",
    "Mr. Bennet made no answer.",
    "“Do you not want to know who has taken it?” cried his wife impatiently.",
    "“You want to tell me, and I have no objection to hearing it.”",
    "This was invitation enough. “Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England.”",
  ],
};

const COVER = { x: 100, y: 400, width: 64, height: 96 };
const HOST = { width: 1020, height: 720 };
const SPREAD = { x: 200, y: 100, width: 540, height: 340 };

test("flight vars land the cover on the live spread", () => {
  const vars = flightVars({
    from: COVER,
    dest: SPREAD,
    host: HOST,
    book: DESKTOP_BOOK_PX,
    fallbackToScale: 3.15,
  });
  assert.equal(vars.fromX, "-378px");
  assert.equal(vars.fromY, "88px");
  assert.equal(vars.fromS, "0.381");
  assert.equal(vars.toX, "-40px");
  assert.equal(vars.toY, "-90px");
  assert.equal(vars.toS, "1.523");
});

test("flight vars keep the phone book and the center fallback", () => {
  const phone = flightVars({
    from: COVER,
    dest: SPREAD,
    host: HOST,
    book: PHONE_BOOK_PX,
    fallbackToScale: 2.35,
  });
  assert.equal(phone.fromS, "0.533");
  const waiting = flightVars({
    from: COVER,
    dest: null,
    host: HOST,
    book: DESKTOP_BOOK_PX,
    fallbackToScale: 3.15,
  });
  assert.equal(waiting.toX, "0px");
  assert.equal(waiting.toY, "0px");
  assert.equal(waiting.toS, "3.150");
});

test("spread box unions the shell pages and drops empty rects", () => {
  assert.deepEqual(
    unionBoxes([
      { x: 200, y: 100, width: 270, height: 340 },
      { x: 470, y: 100, width: 270, height: 340 },
      { x: 0, y: 0, width: 0, height: 10 },
    ]),
    SPREAD,
  );
  assert.equal(unionBoxes([{ x: 0, y: 0, width: 0, height: 0 }]), null);
});

test("motion is instant for reduced motion and flat for a coarse pointer", () => {
  assert.equal(
    resolveFlightMotion({ reducedMotion: true, coarsePointer: true, layout: "desktop" }),
    "reduced",
  );
  assert.equal(
    resolveFlightMotion({ reducedMotion: false, coarsePointer: true, layout: "phone" }),
    "flat",
  );
  assert.equal(
    resolveFlightMotion({ reducedMotion: false, coarsePointer: false, layout: "phone" }),
    "phone",
  );
  assert.equal(
    resolveFlightMotion({ reducedMotion: false, coarsePointer: false, layout: "desktop" }),
    "desktop",
  );
  assert.equal(resolveFlightLayout(undefined, 390), "phone");
  assert.equal(resolveFlightLayout(undefined, 1020), "desktop");
  assert.equal(resolveFlightLayout("desktop", 390), "desktop");
});

test("painted shell text replaces the fallback and keeps a phone column split", () => {
  const other = spreadFromPainted(
    [
      { page: null, lines: ["Alpha line"] },
      { page: 12, lines: ["Beta line"] },
    ],
    JOURNEY_LANDING_PAGE,
  );
  assert.equal(other.page, 12);
  assert.deepEqual(other.left, ["Alpha line"]);
  assert.deepEqual(other.right, ["Beta line"]);
  assert.equal(other.headingRight, "p. 12");

  const column = spreadFromPainted(
    [{ page: 47, lines: [...JOURNEY_LANDING_PAGE.left, ...JOURNEY_LANDING_PAGE.right] }],
    JOURNEY_LANDING_PAGE,
  );
  assert.deepEqual(column.left, JOURNEY_LANDING_PAGE.left);
  assert.deepEqual(column.right, JOURNEY_LANDING_PAGE.right);
  assert.equal(column.headingLeft, "Chapter I");
  assert.equal(column.headingRight, "p. 47");

  const empty = spreadFromPainted([{ page: null, lines: [] }], JOURNEY_LANDING_PAGE);
  assert.equal(empty.page, 47);
  assert.deepEqual(empty.left, JOURNEY_LANDING_PAGE.left);
});

test("cover colors stay plain css colors", () => {
  assert.equal(safeCoverColor("#3d2a1c"), "#3d2a1c");
  assert.equal(safeCoverColor("rgba(61, 42, 28, 0.5)"), "rgba(61, 42, 28, 0.5)");
  assert.equal(safeCoverColor("red; background: url(https://evil)"), null);
  assert.equal(safeCoverColor(""), null);
});

/** Literal pattern: escape `\` first, then the other regex metacharacters. */
function escapeRegExp(value) {
  return value.replace(/\\/g, "\\\\").replace(/[.*+?^${}()|[\]]/g, "\\$&");
}

test("flight sheet matches the mock timing and 1.5.0 tokens", () => {
  const css = OPEN_BOOK_FLIGHT_CSS;
  assert.match(css, new RegExp(escapeRegExp(FLIGHT_EASE)));
  assert.match(css, new RegExp(`${FLIGHT_MS}ms`));
  assert.match(css, new RegExp(`${COVER_OPEN_MS.duration}ms ${COVER_OPEN_MS.delay}ms`));
  for (const leaf of FLIP_LEAVES) {
    assert.match(css, new RegExp(`${leaf.duration}ms ${leaf.delay}ms`));
  }
  assert.match(css, /--atomic-r-object:\s*3px/);
  assert.match(css, /--atomic-r-control:\s*9px/);
  assert.match(css, /--atomic-r-well:\s*14px/);
  assert.match(css, /Inter/);
  assert.match(css, /Literata/);
  assert.match(css, /width:\s*168px/);
  assert.match(css, /height:\s*248px/);
  assert.match(css, /width:\s*120px/);
  assert.match(css, /height:\s*178px/);
  assert.match(css, /rotateY\(-168deg\)/);
  assert.match(css, /rotateY\(-178deg\)/);
  assert.doesNotMatch(css, /!important/);
  assert.doesNotMatch(css, /:has\(/);
  assert.doesNotMatch(css, /clip-path|mask-image|-webkit-mask|column-gap|column-count/);
  assert.doesNotMatch(css, /purple|#7c3aed|#8b5cf6|#a855f7|rebeccapurple/i);
});

test("flight source stays in its folder and off other readers", () => {
  assert.deepEqual(readdirSync(join(root, "src/reader")).sort(), ["flight", "shell"]);
  const names = readdirSync(flightDir).sort();
  assert.deepEqual(names, [
    "geometry.ts",
    "index.ts",
    "mount.ts",
    "page.ts",
    "register.ts",
    "styles.ts",
  ]);
  for (const name of names) {
    const text = readFileSync(join(flightDir, name), "utf8");
    assert.doesNotMatch(text, /\bglobalThis\b/);
    assert.doesNotMatch(text, /readest|epub\.js|foliate|AGPL|GPL-3/i);
    assert.doesNotMatch(text, /\.style\.setProperty\(\s*["'][^"']+["']\s*,\s*["']/);
    assert.doesNotMatch(text, /openReaderDirect/);
  }
  const mount = readFileSync(join(flightDir, "mount.ts"), "utf8");
  assert.match(mount, /activeDocument/);
  assert.match(mount, /activeWindow/);
  assert.match(mount, /\.atomic-reader-page/);
  const register = readFileSync(join(flightDir, "register.ts"), "utf8");
  assert.match(register, /registerReaderFlight/);
  assert.match(register, /page:\s*1/);
  assert.match(register, /left:\s*\[\]/);
  assert.match(register, /right:\s*\[\]/);
  assert.doesNotMatch(register, /JOURNEY_LANDING_PAGE|universally acknowledged/);
  assert.doesNotMatch(readFileSync(join(flightDir, "index.ts"), "utf8"), /JOURNEY_LANDING_PAGE/);
  assert.doesNotMatch(readFileSync(join(flightDir, "page.ts"), "utf8"), /JOURNEY_LANDING_PAGE|universally acknowledged/);
  const main = readFileSync(join(root, "src/main.ts"), "utf8");
  assert.match(main, /registerOpenBookFlight/);
  assert.equal(openBookFlightView(), null);
});

test("registered flight lands on the live reader page", async () => {
  resetReaderMounts();
  const tap = makeHost();
  tap.verso.className = "atomic-reader-page is-verso";
  tap.verso.setAttribute("data-blank", "true");
  tap.recto.className = "atomic-reader-page is-recto";
  tap.destination.setAttribute("data-testid", "atomic-reader");
  paint(tap.recto, ["Harbor light kept the first page."], 1);
  const opened = [];
  const request = {
    notePath: "notes/book.md",
    filePath: "notes/book.epub",
    title: "Harbor Notes",
    kind: "epub",
    returnPath: "notes/shelf.md",
    coverRect: { x: 100, y: 400, width: 64, height: 96, color: "#3d2a1c" },
  };

  const missing = await playOpenBookFlight(() => {
    opened.push("missing");
  }, request);
  assert.equal(missing, false);
  assert.deepEqual(opened, []);

  globalThis.activeWindow = tap.view;
  globalThis.activeDocument = tap.doc;
  try {
    tap.media["(prefers-reduced-motion: reduce)"] = true;
    const reduced = await playOpenBookFlight(() => {
      opened.push("reduced");
    }, request);
    assert.equal(reduced, false);
    assert.deepEqual(opened, []);
    assert.equal(tap.doc.querySelector("[data-testid='atomic-open-flight']"), null);
    assert.equal(tap.doc.getElementById("atomic-open-flight-style"), null);

    tap.media["(prefers-reduced-motion: reduce)"] = false;
    registerOpenBookFlight(async () => {
      opened.push("direct");
    });
    const flight = readerMounts().flight;
    assert.ok(flight);
    const handled = await flight.open(request);
    assert.equal(handled, true);
    assert.deepEqual(opened, ["direct"]);
    const overlay = tap.body.querySelector("[data-testid='atomic-open-flight']");
    assert.equal(overlay.parentElement, tap.body);
    assert.equal(overlay.getAttribute("data-overlay-host"), "window");
    assert.equal(tap.reading.contains(overlay), false);
    const book = overlay.querySelector("[data-testid='atomic-open-book']");
    assert.equal(book.style.getPropertyValue("--from-x"), "-378px");
    assert.equal(book.style.getPropertyValue("--from-y"), "88px");
    assert.equal(book.style.getPropertyValue("--from-s"), "0.381");
    assert.equal(book.style.getPropertyValue("--to-x"), "-40px");
    assert.equal(book.style.getPropertyValue("--to-y"), "-90px");
    assert.equal(book.style.getPropertyValue("--to-s"), "1.523");
    assert.equal(overlay.getAttribute("data-page"), "1");
    assert.deepEqual(leafLines(overlay, "left"), ["Harbor light kept the first page."]);
  } finally {
    delete globalThis.activeWindow;
    delete globalThis.activeDocument;
    resetReaderMounts();
  }
});

test("registered flight lands on the active leaf, not a hidden reader", async () => {
  const tap = makeHost({ rects: false });
  const hiddenLeaf = tap.doc.createElement("div");
  hiddenLeaf.className = "workspace-leaf";
  const hidden = tap.doc.createElement("div");
  hidden.setAttribute("data-testid", "atomic-reader");
  const hiddenPage = tap.doc.createElement("div");
  hiddenPage.className = "atomic-reader-page";
  paint(hiddenPage, ["Hidden page"], 9);
  hidden.append(hiddenPage);
  hiddenLeaf.append(hidden);

  const activeLeaf = tap.doc.createElement("div");
  activeLeaf.className = "workspace-leaf mod-active";
  tap.destination.setAttribute("data-testid", "atomic-reader");
  tap.verso.className = "atomic-reader-page is-verso";
  tap.verso.setAttribute("data-blank", "true");
  tap.recto.className = "atomic-reader-page is-recto";
  tap.verso.setRect(200, 100, 270, 340);
  tap.recto.setRect(470, 100, 270, 340);
  paint(tap.recto, ["Harbor light kept the first page."], 1);
  activeLeaf.append(tap.destination);
  tap.body.append(hiddenLeaf, activeLeaf);

  globalThis.activeWindow = tap.view;
  globalThis.activeDocument = tap.doc;
  try {
    const handled = await playOpenBookFlight(async () => {}, {
      notePath: "notes/book.md",
      filePath: "notes/book.epub",
      title: "Harbor Notes",
      kind: "epub",
      returnPath: "notes/shelf.md",
      coverRect: { x: 100, y: 400, width: 64, height: 96, color: "#3d2a1c" },
    });
    assert.equal(handled, true);
    const overlay = tap.body.querySelector("[data-testid='atomic-open-flight']");
    const book = overlay.querySelector("[data-testid='atomic-open-book']");
    assert.equal(book.style.getPropertyValue("--to-s"), "1.523");
    assert.equal(overlay.getAttribute("data-page"), "1");
    assert.deepEqual(leafLines(overlay, "left"), ["Harbor light kept the first page."]);
    assert.equal(overlay.textContent.includes("Hidden page"), false);
  } finally {
    delete globalThis.activeWindow;
    delete globalThis.activeDocument;
    resetReaderMounts();
  }
});

test("registered flight stays blank when the reader has no lines yet", async () => {
  const tap = makeHost();
  tap.destination.setAttribute("data-testid", "atomic-reader");
  tap.verso.className = "atomic-reader-page is-verso";
  tap.recto.className = "atomic-reader-page is-recto";
  globalThis.activeWindow = tap.view;
  globalThis.activeDocument = tap.doc;
  try {
    const handled = await playOpenBookFlight(async () => {}, {
      notePath: "notes/book.md",
      filePath: "notes/book.pdf",
      title: "Harbor Notes",
      kind: "pdf",
      returnPath: "notes/shelf.md",
      coverRect: { x: 100, y: 400, width: 64, height: 96, color: "#3d2a1c" },
    });
    assert.equal(handled, true);
    const overlay = tap.body.querySelector("[data-testid='atomic-open-flight']");
    assert.equal(overlay.getAttribute("data-page"), "1");
    assert.deepEqual(leafLines(overlay, "left"), []);
    assert.deepEqual(leafLines(overlay, "right"), []);
    assert.equal(overlay.textContent.includes("universally acknowledged"), false);
    assert.equal(overlay.textContent.includes("Chapter I"), false);
  } finally {
    delete globalThis.activeWindow;
    delete globalThis.activeDocument;
    resetReaderMounts();
  }
});

test("overlay body is activeDocument.body for the tap window", () => {
  const tap = makeHost();
  assert.equal(flightOverlayBody(tap.view, tap.doc), tap.body);
  const other = makeHost();
  assert.equal(flightOverlayBody(tap.view, other.doc), tap.body);
  assert.throws(() => flightOverlayBody({ document: {} }, null), /document body/);
});

test("flight lands on the page the shell painted", () => {
  const tap = makeHost();
  paint(tap.verso, ["Alpha line"]);
  paint(tap.recto, ["Beta line"], 12);
  const reasons = [];
  const handle = mountOpenBookFlight(request(tap), (reason) => {
    reasons.push(reason);
  });
  const overlay = handle.overlay;
  assert.ok(overlay);
  assert.equal(overlay.parentElement, tap.body);
  assert.equal(overlay.getAttribute("data-overlay-host"), "window");
  assert.equal(tap.reading.contains(overlay), false);
  assert.equal(overlay.getAttribute("data-page"), "12");
  assert.equal(overlay.getAttribute("data-motion"), "desktop");
  assert.deepEqual(leafLines(overlay, "left"), ["Alpha line"]);
  assert.deepEqual(leafLines(overlay, "right"), ["Beta line"]);
  assert.deepEqual(leafLines(overlay, "left"), paragraphs(tap.verso));
  assert.deepEqual(leafLines(overlay, "right"), paragraphs(tap.recto));
  const book = overlay.querySelector("[data-testid='atomic-open-book']");
  assert.equal(book.style.getPropertyValue("--to-x"), "-40px");
  assert.equal(book.style.getPropertyValue("--to-y"), "-90px");
  assert.equal(book.style.getPropertyValue("--to-s"), "1.523");
  assert.equal(book.style.getPropertyValue("--from-x"), "-378px");
  assert.equal(overlay.querySelector(".atomic-open-title").textContent, "Pride and Prejudice");
  assert.equal(overlay.querySelector(".atomic-open-hint").textContent, OPEN_BOOK_HINT);
  assert.equal(overlay.querySelectorAll(".atomic-open-flip").length, FLIP_LEAVES.length);
  assert.equal(reasons.length, 0);
  assert.equal(tap.timers.size, 1);
  assert.equal([...tap.timers.values()][0].ms, FLIGHT_SKIP_MS);
});

test("empty shell pages still show the journey landing page", () => {
  const tap = makeHost();
  const handle = mountOpenBookFlight(request(tap, { page: JOURNEY_LANDING_PAGE }));
  assert.equal(handle.overlay.getAttribute("data-page"), "47");
  assert.deepEqual(leafLines(handle.overlay, "left"), JOURNEY_LANDING_PAGE.left);
  assert.deepEqual(leafLines(handle.overlay, "right"), JOURNEY_LANDING_PAGE.right);
  assert.equal(handle.overlay.querySelector(".atomic-open-k").textContent, "Chapter I");
});

test("reduced motion opens the shell page without a second layout", () => {
  const tap = makeHost();
  paint(tap.verso, ["Alpha line"]);
  paint(tap.recto, ["Beta line"], 12);
  const readers = tap.doc.querySelectorAll(".atomic-reader").length;
  const reasons = [];
  const handle = mountOpenBookFlight(request(tap, { reducedMotion: true }), (reason) => {
    reasons.push(reason);
  });
  assert.equal(handle.overlay, null);
  assert.deepEqual(reasons, ["reduced"]);
  assert.equal(tap.doc.querySelector("[data-testid='atomic-open-flight']"), null);
  assert.equal(tap.doc.querySelectorAll(".atomic-reader").length, readers);
  assert.deepEqual(paragraphs(tap.recto), ["Beta line"]);
  assert.equal(tap.doc.querySelectorAll("style").length, 0);
});

test("prefers-reduced-motion uses the same direct open", () => {
  const tap = makeHost();
  tap.media["(prefers-reduced-motion: reduce)"] = true;
  const reasons = [];
  const handle = mountOpenBookFlight(request(tap), (reason) => reasons.push(reason));
  assert.equal(handle.overlay, null);
  assert.deepEqual(reasons, ["reduced"]);
});

test("a reading-view unload leaves the flight on the body", () => {
  const tap = makeHost();
  const reasons = [];
  const handle = mountOpenBookFlight(request(tap), (reason) => reasons.push(reason));
  tap.reading.remove();
  assert.equal(tap.body.contains(handle.overlay), true);
  assert.equal(handle.overlay.isConnected, true);
  assert.equal(tap.body.querySelector(".atomic-block-pending"), null);
  const job = [...tap.timers.values()][0];
  job.fn();
  assert.deepEqual(reasons, ["landed"]);
  assert.equal(handle.overlay.isConnected, false);
  job.fn();
  assert.deepEqual(reasons, ["landed"]);
});

test("tap, Escape, and a closed window end the flight once", async () => {
  const tap = makeHost();
  const reasons = [];
  const handle = mountOpenBookFlight(request(tap), (reason) => reasons.push(reason));
  handle.overlay.dispatchEvent({ type: "click" });
  assert.deepEqual(reasons, ["skipped"]);
  assert.equal(await handle.done, "skipped");
  assert.equal(tap.timers.size, 0);

  const esc = [];
  const escaped = mountOpenBookFlight(request(tap), (reason) => esc.push(reason));
  let stopped = false;
  tap.view.dispatch("keydown", {
    key: "Escape",
    preventDefault() {},
    stopPropagation() {
      stopped = true;
    },
  });
  assert.equal(stopped, true);
  assert.deepEqual(esc, ["skipped"]);
  assert.equal(escaped.overlay.isConnected, false);

  const left = [];
  const flight = mountOpenBookFlight(request(tap), (reason) => left.push(reason));
  tap.view.dispatch("pagehide", {});
  assert.deepEqual(left, []);
  assert.equal(await flight.done, "aborted");
  assert.equal(flight.overlay.isConnected, false);
});

test("a second open aborts the first overlay", async () => {
  const tap = makeHost();
  const firstReasons = [];
  const first = mountOpenBookFlight(request(tap), (reason) => firstReasons.push(reason));
  const secondReasons = [];
  const second = mountOpenBookFlight(
    request(tap, { reducedMotion: true }),
    (reason) => secondReasons.push(reason),
  );
  assert.deepEqual(firstReasons, []);
  assert.equal(await first.done, "aborted");
  assert.equal(first.overlay.isConnected, false);
  assert.deepEqual(secondReasons, ["reduced"]);
  assert.equal(tap.doc.querySelectorAll("[data-testid='atomic-open-flight']").length, 0);
  assert.equal(tap.doc.querySelectorAll("style").length, 1);
});

test("phone and coarse pointer pick their motions and still land on the spread", () => {
  const phone = makeHost();
  const phoneFlight = mountOpenBookFlight(request(phone, { layout: "phone" }));
  assert.equal(phoneFlight.overlay.classList.contains("is-phone"), true);
  assert.equal(
    phoneFlight.overlay.querySelector("[data-testid='atomic-open-book']").style.getPropertyValue("--from-s"),
    "0.533",
  );
  phoneFlight.abort();

  const coarse = makeHost();
  coarse.media["(pointer: coarse)"] = true;
  const flat = mountOpenBookFlight(request(coarse, { layout: "phone" }));
  assert.equal(flat.overlay.getAttribute("data-motion"), "flat");
  assert.equal(flat.overlay.classList.contains("is-flat"), true);
  assert.equal(flat.overlay.classList.contains("is-phone"), true);
  assert.equal(
    flat.overlay.querySelector("[data-testid='atomic-open-book']").style.getPropertyValue("--to-s"),
    "2.122",
  );
});

test("layout waits one frame when the shell pages have no rect yet", () => {
  const tap = makeHost({ rects: false });
  const handle = mountOpenBookFlight(request(tap));
  assert.equal(handle.overlay.classList.contains("is-playing"), false);
  assert.equal(tap.frames.length, 1);
  tap.verso.setRect(200, 100, 270, 340);
  tap.recto.setRect(470, 100, 270, 340);
  tap.flushFrames();
  assert.equal(handle.overlay.classList.contains("is-playing"), true);
  assert.equal(
    handle.overlay.querySelector("[data-testid='atomic-open-book']").style.getPropertyValue("--to-x"),
    "-40px",
  );
});

test("unsafe cover color is not written onto the overlay", () => {
  const tap = makeHost();
  const handle = mountOpenBookFlight(request(tap, {
    cover: {
      title: "Pride and Prejudice",
      author: "Jane Austen",
      color: "red; background: url(https://evil)",
      ink: "#f4ecdf",
    },
  }));
  assert.equal(handle.overlay.style.getPropertyValue("--atomic-open-cover"), "");
  assert.equal(handle.overlay.style.getPropertyValue("--atomic-open-ink"), "#f4ecdf");
});

function request(tap, extra = {}) {
  return {
    view: tap.view,
    from: COVER,
    cover: { title: "Pride and Prejudice", author: "Jane Austen", color: "#3d2a1c", ink: "#f4ecdf" },
    page: JOURNEY_LANDING_PAGE,
    destination: tap.destination,
    ...extra,
  };
}

function paint(page, lines, pageNumber) {
  page.replaceChildren();
  if (pageNumber) page.setAttribute("data-page", String(pageNumber));
  else page.attrs.delete("data-page");
  for (const line of lines) {
    const para = page.ownerDocument.createElement("p");
    para.textContent = line;
    page.appendChild(para);
  }
}

function paragraphs(page) {
  return [...page.querySelectorAll("p")].map((node) => node.textContent);
}

function leafLines(overlay, side) {
  const leaf = overlay.querySelector(`[data-side="${side}"]`);
  return [...leaf.querySelectorAll("[data-line]")].map((node) => node.textContent);
}

function makeHost({ rects = true } = {}) {
  const doc = {};
  const body = new FakeEl(doc, "body");
  const head = new FakeEl(doc, "head");
  const timers = new Map();
  const frames = [];
  let timerId = 0;
  let frameId = 0;
  const media = {};
  const listeners = new Map();
  const view = {
    document: doc,
    innerWidth: HOST.width,
    innerHeight: HOST.height,
    media,
    matchMedia(query) {
      return { matches: media[query] === true };
    },
    setTimeout(fn, ms) {
      const id = ++timerId;
      timers.set(id, { fn, ms });
      return id;
    },
    clearTimeout(id) {
      timers.delete(id);
    },
    requestAnimationFrame(fn) {
      const id = ++frameId;
      frames.push({ id, fn });
      return id;
    },
    cancelAnimationFrame(id) {
      const index = frames.findIndex((frame) => frame.id === id);
      if (index >= 0) frames.splice(index, 1);
    },
    addEventListener(type, fn) {
      const list = listeners.get(type) ?? [];
      list.push(fn);
      listeners.set(type, list);
    },
    removeEventListener(type, fn) {
      const list = listeners.get(type) ?? [];
      listeners.set(type, list.filter((item) => item !== fn));
    },
    dispatch(type, event) {
      for (const fn of [...(listeners.get(type) ?? [])]) fn(event);
    },
  };
  Object.assign(doc, {
    body,
    head,
    defaultView: view,
    createElement(tag) {
      return new FakeEl(doc, tag);
    },
    getElementById(id) {
      return find(doc, (node) => node.getAttribute?.("id") === id);
    },
    querySelector(selector) {
      return this.querySelectorAll(selector)[0] ?? null;
    },
    querySelectorAll(selector) {
      const out = [];
      walk(head, selector, out);
      walk(body, selector, out);
      return out;
    },
  });

  const reading = doc.createElement("div");
  reading.className = "markdown-reading-view";
  const block = doc.createElement("div");
  block.setAttribute("data-block-host", "");
  reading.appendChild(block);
  const destination = doc.createElement("div");
  destination.className = "atomic-reader";
  const verso = doc.createElement("div");
  verso.className = "atomic-page is-verso";
  const recto = doc.createElement("div");
  recto.className = "atomic-page is-recto";
  if (rects) {
    verso.setRect(200, 100, 270, 340);
    recto.setRect(470, 100, 270, 340);
  }
  destination.append(verso, recto);
  body.append(reading, destination);

  return {
    view,
    doc,
    body,
    reading,
    block,
    destination,
    verso,
    recto,
    timers,
    frames,
    media,
    flushFrames() {
      const pending = frames.splice(0);
      for (const frame of pending) frame.fn();
    },
  };
}

function walk(node, selector, out) {
  for (const child of node.children) {
    if (matches(child, selector)) out.push(child);
    walk(child, selector, out);
  }
}

function find(doc, testNode) {
  const visit = (node) => {
    if (testNode(node)) return node;
    for (const child of node.children ?? []) {
      const found = visit(child);
      if (found) return found;
    }
    return null;
  };
  return visit(doc.head) ?? visit(doc.body);
}

function matches(el, selector) {
  return selector.split(",").some((part) => matchOne(el, part.trim()));
}

function matchOne(el, selector) {
  if (selector.startsWith(".")) return el.classList.contains(selector.slice(1));
  const valued = selector.match(/^\[([^\]=]+)=["']([^"']*)["']\]$/);
  if (valued) return el.getAttribute(valued[1]) === valued[2];
  const bare = selector.match(/^\[([^\]=]+)\]$/);
  if (bare) return el.getAttribute(bare[1]) !== null;
  if (/^[a-z0-9]+$/i.test(selector)) return el.tagName === selector.toUpperCase();
  return false;
}

class FakeStyle {
  constructor() {
    this.map = new Map();
  }

  setProperty(name, value) {
    this.map.set(name, String(value));
  }

  getPropertyValue(name) {
    return this.map.get(name) ?? "";
  }
}

class FakeClassList {
  constructor() {
    this.set = new Set();
  }

  add(...names) {
    for (const name of names) {
      if (name) this.set.add(name);
    }
  }

  remove(...names) {
    for (const name of names) this.set.delete(name);
  }

  contains(name) {
    return this.set.has(name);
  }
}

class FakeEl {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentElement = null;
    this.attrs = new Map();
    this.listeners = new Map();
    this.classList = new FakeClassList();
    this.style = new FakeStyle();
    this.rect = { x: 0, y: 0, left: 0, top: 0, width: 0, height: 0, right: 0, bottom: 0 };
    this._text = "";
  }

  get className() {
    return [...this.classList.set].join(" ");
  }

  set className(value) {
    this.classList.set.clear();
    for (const name of String(value).split(/\s+/)) {
      if (name) this.classList.set.add(name);
    }
  }

  get textContent() {
    if (this.children.length === 0) return this._text;
    return this.children.map((child) => child.textContent).join("");
  }

  set textContent(value) {
    this._text = String(value ?? "");
    this.children = [];
  }

  get id() {
    return this.getAttribute("id") ?? "";
  }

  set id(value) {
    this.setAttribute("id", value);
  }

  get offsetWidth() {
    return this.rect.width;
  }

  get isConnected() {
    let node = this;
    while (node) {
      if (node === this.ownerDocument.body || node === this.ownerDocument.head) return true;
      node = node.parentElement;
    }
    return false;
  }

  setAttribute(name, value) {
    this.attrs.set(name, String(value));
  }

  getAttribute(name) {
    return this.attrs.has(name) ? this.attrs.get(name) : null;
  }

  appendChild(child) {
    if (child.parentElement) child.parentElement.removeChild(child);
    child.parentElement = this;
    this.children.push(child);
    return child;
  }

  append(...nodes) {
    for (const node of nodes) this.appendChild(node);
  }

  removeChild(child) {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
    if (child.parentElement === this) child.parentElement = null;
    return child;
  }

  replaceChildren(...nodes) {
    for (const child of this.children) child.parentElement = null;
    this.children = [];
    for (const node of nodes) this.appendChild(node);
  }

  remove() {
    this.parentElement?.removeChild(this);
  }

  contains(node) {
    let current = node;
    while (current) {
      if (current === this) return true;
      current = current.parentElement;
    }
    return false;
  }

  addEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  removeEventListener(type, fn) {
    const list = this.listeners.get(type) ?? [];
    this.listeners.set(type, list.filter((item) => item !== fn));
  }

  dispatchEvent(event) {
    for (const fn of [...(this.listeners.get(event.type) ?? [])]) fn(event);
    return true;
  }

  getBoundingClientRect() {
    return { ...this.rect };
  }

  setRect(x, y, width, height) {
    this.rect = {
      x,
      y,
      left: x,
      top: y,
      width,
      height,
      right: x + width,
      bottom: y + height,
    };
  }

  closest(selector) {
    let node = this;
    while (node) {
      if (matches(node, selector)) return node;
      node = node.parentElement;
    }
    return null;
  }

  querySelector(selector) {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector) {
    const out = [];
    walk(this, selector, out);
    return out;
  }
}
