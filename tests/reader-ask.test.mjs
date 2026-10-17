import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { readingItemMarkdown } from "../src/commands/hobby-item.ts";
import { mergeSettings } from "../src/util/merge-settings.ts";
import { runAsk } from "../src/reader/ask/ask.ts";
import {
  applyBookCard,
  marginSourcesFromCanvas,
  readRelatedCanvas,
  seedBookCanvas,
} from "../src/reader/ask/canvas.ts";
import { buildAskRequest, buildProbeRequest } from "../src/reader/ask/provider.ts";
import { readerSlotForGutter } from "../src/reader/ask/remarks.ts";
import { selectionShift } from "../src/reader/ask/paint.ts";
import { marginNotesForPage, readerAskView } from "../src/reader/ask/view.ts";
import {
  isSecretId,
  normalizeAskSettings,
  SecretStore,
} from "../src/reader/ask/settings-record.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SECRET = "sk-unit-test-key-9f3a-should-not-leak";
const NOTE = "atomics/hobbies/Reading/Items/Pride and Prejudice.md";

function memorySecrets(initial = {}) {
  const map = new Map(Object.entries(initial));
  return {
    port: {
      get(id) {
        return map.has(id) ? map.get(id) : null;
      },
      set(id, secret) {
        map.set(id, secret);
      },
      list() {
        return [...map.keys()];
      },
    },
    map,
  };
}

function httpPort(handler) {
  const calls = [];
  return {
    calls,
    async send(request) {
      calls.push(request);
      return handler(request);
    },
  };
}

function ids() {
  let n = 0;
  return () => {
    n += 1;
    return `id-${n}`;
  };
}

function note() {
  return readingItemMarkdown("Pride and Prejudice");
}

test("selection pill stays inside the window", () => {
  assert.equal(selectionShift({ left: 1100, right: 1380 }, 1262), -126);
  assert.equal(selectionShift({ left: -40, right: 240 }, 1262), 48);
  assert.equal(selectionShift({ left: 400, right: 680 }, 1262), 0);
  assert.equal(selectionShift({ left: 0, right: 0 }, 1262), 0);
  assert.equal(selectionShift({ left: 20, right: 1400 }, 1262), -79);
});

test("secret store keeps the value in the port, not in settings", () => {
  const secrets = memorySecrets();
  const store = new SecretStore(secrets.port);
  assert.deepEqual(store.save("atomic-ask", SECRET), { ok: true });
  assert.equal(store.read("atomic-ask"), SECRET);
  assert.deepEqual(store.list(), ["atomic-ask"]);
  assert.deepEqual(store.save("Not Valid", SECRET), { ok: false, reason: "bad-id" });
  assert.deepEqual(store.save("atomic-ask", "  "), { ok: false, reason: "empty" });
  assert.equal(store.read("missing"), null);
  assert.equal(isSecretId("sk-" + "a".repeat(80)), false);

  const merged = mergeSettings({
    ask: {
      provider: "openai",
      model: "gpt-4.1",
      secretName: "atomic-ask",
      baseUrl: "javascript:alert(1)",
      apiKey: SECRET,
      secret: SECRET,
      token: SECRET,
      key: SECRET,
    },
  });
  assert.equal(JSON.stringify(merged).includes(SECRET), false);
  assert.equal(merged.ask.secretName, "atomic-ask");
  assert.equal(merged.ask.baseUrl, "");
  assert.equal(merged.ask.model, "gpt-4.1");
  assert.deepEqual(Object.keys(merged.ask).sort(), ["baseUrl", "model", "provider", "secretName"]);

  const namedAsKey = normalizeAskSettings({
    provider: "anthropic",
    secretName: SECRET,
    apiKey: SECRET,
    baseUrl: "http://evil.example/v1",
  });
  assert.equal(namedAsKey.secretName, "");
  assert.equal(namedAsKey.baseUrl, "");
  assert.equal(namedAsKey.provider, "anthropic");

  const local = normalizeAskSettings({
    provider: "openai-compatible",
    baseUrl: "http://127.0.0.1:11434/v1/",
    secretName: "atomic-ask",
  });
  assert.equal(local.baseUrl, "http://127.0.0.1:11434/v1");
});

test("one canvas per book, created on the first remark", () => {
  const markdown = note();
  assert.equal(readRelatedCanvas(markdown), "");
  assert.equal(readRelatedCanvas(markdown), "");

  const first = applyBookCard({
    notePath: NOTE,
    noteMarkdown: markdown,
    canvasJson: null,
    ids: ids(),
    card: {
      kind: "remark",
      page: 47,
      quote: "a truth universally acknowledged",
      body: "The line everyone quotes. Keep it.",
      chapter: "Chapter I",
    },
  });
  assert.equal(first.ok, true);
  assert.equal(first.canvasPath, "atomics/hobbies/Reading/Items/Pride and Prejudice.canvas");
  assert.match(first.noteMarkdown, /related_canvas: "atomics\/hobbies\/Reading\/Items\/Pride and Prejudice\.canvas"/);
  assert.match(first.noteMarkdown, /## Remarks/);
  const canvas = JSON.parse(first.canvasJson);
  assert.equal(canvas.nodes.filter((node) => node.atomic?.role === "book").length, 1);
  assert.equal(canvas.nodes.filter((node) => node.atomic?.role === "board").length, 5);
  assert.equal(canvas.nodes.filter((node) => node.atomic?.kind === "remark").length, 1);
  assert.equal(canvas.nodes.some((node) => node.type === "group" && node.label === "Ask thread"), true);
  assert.equal(canvas.nodes.some((node) => node.type === "group" && node.label === "Opening"), true);
  assert.equal(canvas.nodes.some((node) => node.color === "6"), false);
  const quote = canvas.nodes.find((node) => node.atomic?.kind === "remark");
  assert.equal(quote.atomic.board, "quote");
  assert.equal(quote.color, "3");
  assert.equal(canvas.edges.length, 4);

  const second = applyBookCard({
    notePath: NOTE,
    noteMarkdown: first.noteMarkdown,
    canvasJson: first.canvasJson,
    ids: ids(),
    card: {
      kind: "highlight",
      page: 47,
      quote: "a young man of large fortune",
      body: "",
    },
  });
  assert.equal(second.ok, true);
  assert.equal(second.canvasPath, first.canvasPath);
  assert.equal(second.noteMarkdown, first.noteMarkdown);
  const again = JSON.parse(second.canvasJson);
  assert.equal(again.nodes.filter((node) => node.atomic?.role === "book").length, 1);
  assert.equal(again.nodes.filter((node) => node.atomic?.kind === "highlight").length, 1);
  assert.equal(again.nodes.filter((node) => node.atomic?.board === "quote" && node.atomic?.kind).length, 2);

  const linked = markdown.replace(
    "related_canvas:",
    'related_canvas: "[[atomics/hobbies/Reading/Items/Other.canvas]]"',
  );
  const kept = applyBookCard({
    notePath: NOTE,
    noteMarkdown: linked,
    canvasJson: null,
    ids: ids(),
    card: { kind: "remark", page: 3, quote: "", body: "A note.", chapter: "Chapter I" },
  });
  assert.equal(kept.ok, true);
  assert.equal(kept.canvasPath, "atomics/hobbies/Reading/Items/Other.canvas");
  assert.match(kept.noteMarkdown, /Other\.canvas/);

  assert.equal(
    applyBookCard({
      notePath: "../escape.md",
      noteMarkdown: markdown,
      canvasJson: null,
      card: { kind: "remark", page: 1, quote: "", body: "No." },
    }).ok,
    false,
  );
  assert.equal(
    applyBookCard({
      notePath: NOTE,
      noteMarkdown: markdown,
      canvasJson: "{",
      card: { kind: "remark", page: 1, quote: "", body: "No." },
    }).reason,
    "bad-canvas",
  );
});

test("margin remarks line up beside the highlight and hide in theater", () => {
  const written = applyBookCard({
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    ids: ids(),
    card: {
      kind: "ask",
      page: 47,
      quote: "Why start here?",
      body: "Austen opens on social pressure, not character.",
    },
  });
  const remark = applyBookCard({
    notePath: NOTE,
    noteMarkdown: written.noteMarkdown,
    canvasJson: written.canvasJson,
    ids: ids(),
    card: {
      kind: "remark",
      page: 46,
      quote: "",
      body: "The line everyone quotes.",
    },
  });
  assert.equal(marginSourcesFromCanvas(remark.canvasJson, 47).map((item) => item.kind).join(), "ask");
  assert.equal(marginSourcesFromCanvas(remark.canvasJson, 46)[0].body, "The line everyone quotes.");

  const desktop = marginNotesForPage({
    language: "en",
    canvasJson: remark.canvasJson,
    page: 47,
    surface: "desktop",
    tops: { [marginSourcesFromCanvas(remark.canvasJson, 47)[0].id]: 48 },
  });
  const placed = readerAskView({
    language: "en",
    theater: false,
    surface: "desktop",
    askEnabled: true,
    hasSelection: true,
    askOpen: false,
    pageHeight: 340,
    notes: desktop,
    bookTitle: "Pride and Prejudice",
    page: 47,
    scope: "page",
    turns: [],
    savedToCanvas: false,
    secretReady: true,
    selectionAnchor: { left: 180, top: 90 },
  });
  assert.equal(placed.margins.length, 1);
  assert.equal(placed.margins[0].gutter, "right");
  assert.equal(placed.margins[0].presentation, "card");
  assert.equal(placed.margins[0].top, 48);
  assert.equal(placed.margins[0].title, "Ask · p. 47");
  assert.equal(placed.chrome.showHighlight, true);
  assert.equal(placed.chrome.showRemark, true);
  assert.equal(placed.chrome.showAsk, true);
  assert.equal(placed.panel, null);

  const phone = readerAskView({
    ...viewInput(desktop),
    surface: "phone",
    notes: marginNotesForPage({
      language: "en",
      canvasJson: remark.canvasJson,
      page: 47,
      surface: "phone",
      tops: { [desktop[0].id]: 20 },
    }),
  });
  assert.equal(phone.margins[0].presentation, "dot");
  assert.equal(phone.margins[0].gutter, "phone");

  const crowded = readerAskView({
    ...viewInput([
      { ...desktop[0], id: "a", top: 10, side: "recto" },
      { ...desktop[0], id: "b", top: 12, side: "recto" },
    ]),
    pageHeight: 400,
  });
  assert.ok(crowded.margins[1].top > crowded.margins[0].top);

  const theater = readerAskView({
    ...viewInput(desktop),
    theater: true,
    hasSelection: true,
    askOpen: true,
  });
  assert.equal(theater.chrome.showHighlight, false);
  assert.equal(theater.chrome.showRemark, false);
  assert.equal(theater.chrome.showAsk, false);
  assert.equal(theater.chrome.showMargins, false);
  assert.equal(theater.chrome.showSelectionBar, false);
  assert.deepEqual(theater.margins, []);
  assert.equal(theater.panel, null);
  assert.equal(theater.selection, null);

  const askOff = readerAskView({
    ...viewInput(desktop),
    askEnabled: false,
  });
  assert.equal(askOff.chrome.showHighlight, true);
  assert.equal(askOff.chrome.showAsk, false);

  const sheet = readerAskView({
    ...viewInput([]),
    surface: "phone",
    askOpen: true,
    hasSelection: true,
    scope: "book",
    confirmCharacters: 1200,
  });
  assert.equal(sheet.chrome.showSelectionBar, false);
  assert.equal(sheet.panel.presentation, "screen");
  assert.equal(sheet.panel.title, "Ask · BYO key");
  assert.equal(sheet.panel.subtitle, "Selection · p. 47");
  assert.match(sheet.panel.confirm, /1200/);

  const desk = readerAskView({
    ...viewInput([]),
    askOpen: true,
    hasSelection: true,
  });
  assert.equal(desk.panel.title, "Ask · BYO key");
  assert.equal(desk.panel.subtitle, "Key from Obsidian secret storage ≥1.11.4");
});

test("a new book canvas opens on the journey board", () => {
  const seeded = seedBookCanvas(NOTE);
  assert.ok(seeded);
  const canvas = JSON.parse(seeded.canvasJson);
  const card = (board) => canvas.nodes.find((node) => node.atomic?.role === "card" && node.atomic.board === board);
  assert.match(card("opening").text, /Social pressure as the first character/);
  assert.match(card("quote").text, /a truth universally acknowledged/);
  assert.equal(card("quote").color, "3");
  assert.match(card("ask").text, /Why lead with fortune, not wit/);
  assert.equal(card("ask").color, "5");
  assert.match(card("characters").text, /Bennet · Darcy · Bingley · Elizabeth/);
  assert.match(card("themes").text, /Pride · class · misreading/);
  assert.equal(canvas.nodes.some((node) => node.color === "6"), false);
  assert.equal(canvas.edges.length, 4);
});

function viewInput(notes) {
  return {
    language: "en",
    theater: false,
    surface: "desktop",
    askEnabled: true,
    hasSelection: true,
    askOpen: false,
    pageHeight: 340,
    notes,
    bookTitle: "Pride and Prejudice",
    page: 47,
    scope: "page",
    turns: [],
    savedToCanvas: false,
    secretReady: true,
  };
}

test("ask calls the provider with the user key and writes a canvas card", async () => {
  const secrets = memorySecrets({ "atomic-ask": SECRET });
  const settings = normalizeAskSettings({
    provider: "openai",
    secretName: "atomic-ask",
    model: "gpt-4.1",
    baseUrl: "https://evil.example/steal",
  });
  const http = httpPort(() => ({
    status: 200,
    body: JSON.stringify({
      choices: [{ message: { content: `Because the neighbourhood pretends it is a rule. ${SECRET}` } }],
    }),
  }));
  const off = await runAsk({
    askEnabled: false,
    settings,
    secrets: secrets.port,
    http,
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    request: { scope: "page", page: 47, question: "Why?", pageText: "It is a truth." },
  });
  assert.equal(off.status, "ask-off");
  assert.equal(http.calls.length, 0);

  const confirm = await runAsk({
    askEnabled: true,
    settings,
    secrets: secrets.port,
    http,
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    request: {
      scope: "book",
      page: 47,
      question: "What is the book about?",
      bookText: "A long novel about marriage.",
    },
  });
  assert.equal(confirm.status, "confirm-book");
  assert.equal(confirm.characters, "A long novel about marriage.".length);
  assert.equal(http.calls.length, 0);

  const booked = await runAsk({
    askEnabled: true,
    settings,
    secrets: secrets.port,
    http,
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    ids: ids(),
    request: {
      scope: "book",
      page: 47,
      question: "What is the book about?",
      bookText: "A long novel about marriage.",
      bookConfirmed: true,
    },
  });
  assert.equal(booked.status, "ok");
  assert.equal(http.calls.length, 1);
  assert.equal(http.calls[0].body.includes("A long novel about marriage."), true);
  assert.equal(http.calls[0].body.includes(SECRET), false);

  const sent = await runAsk({
    askEnabled: true,
    settings,
    secrets: secrets.port,
    http,
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    ids: ids(),
    request: {
      scope: "page",
      page: 47,
      question: "Why start with a universal truth?",
      pageText: "It is a truth universally acknowledged.",
      bookText: "DO-NOT-SEND-THE-BOOK",
      quote: "a truth universally acknowledged",
    },
  });
  assert.equal(sent.status, "ok");
  assert.equal(http.calls.length, 2);
  const pageCall = http.calls[1];
  assert.equal(pageCall.url, "https://api.openai.com/v1/chat/completions");
  assert.equal(pageCall.headers.Authorization, `Bearer ${SECRET}`);
  assert.equal(pageCall.body.includes(SECRET), false);
  assert.equal(pageCall.body.includes("DO-NOT-SEND-THE-BOOK"), false);
  assert.equal(pageCall.body.includes("A long novel about marriage."), false);
  assert.equal(pageCall.body.includes("It is a truth universally acknowledged."), true);
  assert.equal(sent.answer.includes(SECRET), false);
  assert.equal(sent.canvasJson.includes(SECRET), false);
  assert.equal(sent.noteMarkdown.includes(SECRET), false);
  assert.match(sent.noteMarkdown, /related_canvas:/);
  assert.equal(JSON.parse(sent.canvasJson).nodes.some((node) => node.atomic?.kind === "ask"), true);

  const anthropic = httpPort(() => ({
    status: 200,
    body: JSON.stringify({ content: [{ type: "text", text: "A short answer." }] }),
  }));
  const anth = await runAsk({
    askEnabled: true,
    settings: normalizeAskSettings({ provider: "anthropic", secretName: "atomic-ask" }),
    secrets: secrets.port,
    http: anthropic,
    notePath: NOTE,
    noteMarkdown: note(),
    canvasJson: null,
    ids: ids(),
    request: {
      scope: "selection",
      page: 47,
      question: "Who is speaking?",
      selection: "My dear Mr. Bennet",
      pageText: "DO-NOT-SEND-THE-PAGE",
    },
  });
  assert.equal(anth.status, "ok");
  assert.equal(anthropic.calls[0].url, "https://api.anthropic.com/v1/messages");
  assert.equal(anthropic.calls[0].headers["x-api-key"], SECRET);
  assert.equal(anthropic.calls[0].headers.Authorization, undefined);
  assert.equal(anthropic.calls[0].body.includes("My dear Mr. Bennet"), true);
  assert.equal(anthropic.calls[0].body.includes("DO-NOT-SEND-THE-PAGE"), false);

  const local = buildAskRequest(
    normalizeAskSettings({
      provider: "openai-compatible",
      secretName: "atomic-ask",
      baseUrl: "http://127.0.0.1:11434/v1",
    }),
    SECRET,
    { scope: "page", page: 2, question: "Hi", pageText: "Hello" },
  );
  assert.equal(local.url, "http://127.0.0.1:11434/v1/chat/completions");
  assert.equal(local.body.includes(SECRET), false);

  const blocked = buildAskRequest(
    normalizeAskSettings({
      provider: "openai-compatible",
      baseUrl: "http://10.0.0.8/v1",
      secretName: "atomic-ask",
    }),
    SECRET,
    { scope: "page", page: 2, question: "Hi", pageText: "Hello" },
  );
  assert.equal(blocked, null);

  const probe = buildProbeRequest(settings, SECRET);
  assert.equal(probe.url, "https://api.openai.com/v1/models");
  assert.equal(probe.method, "GET");
  assert.equal(JSON.stringify(probe).includes("evil.example"), false);
});

test("desktop remarks use the margin gutter and the ask slot", () => {
  assert.equal(readerSlotForGutter("left"), "margin");
  assert.equal(readerSlotForGutter("right"), "ask");
  assert.equal(readerSlotForGutter("phone"), "ask");
});

test("reader ask styles use the margin and ask classes without a purple accent", () => {
  const styles = readFileSync(join(root, "styles.css"), "utf8");
  assert.match(styles, /\.atomic-reader-ask \.atomic-remark/);
  assert.match(styles, /\.atomic-mdot/);
  assert.match(styles, /\.atomic-ask\.is-screen/);
  assert.doesNotMatch(styles, /#7c3aed|#8b5cf6|#a855f7/);
});
