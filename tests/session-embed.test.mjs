import test from "node:test";
import assert from "node:assert/strict";
import { markSessionEmbed, sessionEmbedSlot } from "../src/util/session-embed.ts";

function matches(el, selector) {
  return selector.split(",").some((part) => {
    const token = part.trim();
    if (token.startsWith(".")) return el.classList.contains(token.slice(1));
    const attr = token.match(/^\[class\*='([^']+)'\]$/);
    return attr ? el.className.includes(attr[1]) : false;
  });
}

function node(className, children = [], text = "") {
  const el = {
    className,
    textContent: text,
    children,
    parentElement: null,
    classList: {
      add(...tokens) {
        const set = new Set(el.className.split(/\s+/).filter(Boolean));
        for (const token of tokens) set.add(token);
        el.className = [...set].join(" ");
      },
      contains(token) {
        return el.className.split(/\s+/).filter(Boolean).includes(token);
      },
    },
    closest(selector) {
      let current = el;
      while (current) {
        if (matches(current, selector)) return current;
        current = current.parentElement;
      }
      return null;
    },
  };
  for (const child of children) child.parentElement = el;
  return el;
}

test("live preview marks the embed block, not the whole editor", () => {
  const host = node("atomic-block-host");
  const rendered = node("markdown-rendered", [host]);
  const embed = node("cm-embed-block", [rendered]);
  const content = node("cm-content", [embed]);
  const sizer = node("cm-sizer", [content]);
  assert.equal(sessionEmbedSlot(host), embed);
  markSessionEmbed(host, "timer");
  assert.match(host.className, /atomic-embed-stretch/);
  assert.match(host.className, /atomic-timer-host/);
  assert.match(embed.className, /atomic-embed-slot-timer/);
  assert.match(sizer.className, /atomic-note-column/);
  assert.doesNotMatch(content.className, /atomic-embed-slot/);
});

test("reading view marks the preview block inside the section", () => {
  const host = node("atomic-block-host");
  const block = node("el-pre", [host]);
  const section = node("markdown-preview-section", [block]);
  node("markdown-preview-sizer", [section]);
  assert.equal(sessionEmbedSlot(host), block);
  markSessionEmbed(host, "gym-log");
  assert.match(block.className, /atomic-embed-slot-gym/);
  assert.match(section.parentElement.className, /atomic-note-column/);
});

test("adjacent timer and gym log pair across an empty line", () => {
  const timerHost = node("atomic-block-host");
  const timerEmbed = node("cm-embed-block", [node("markdown-rendered", [timerHost])]);
  const gap = node("cm-line", [], "");
  const gymHost = node("atomic-block-host");
  const gymEmbed = node("cm-embed-block", [node("markdown-rendered", [gymHost])]);
  const content = node("cm-content", [timerEmbed, gap, gymEmbed]);
  node("cm-sizer", [content]);
  markSessionEmbed(timerHost, "timer");
  assert.doesNotMatch(content.className, /atomic-note-paired/);
  markSessionEmbed(gymHost, "gym-log");
  assert.match(content.className, /atomic-note-paired/);
  assert.match(gap.className, /atomic-embed-gap/);
});

test("live preview lines share a row across an empty line", () => {
  const timerHost = node("atomic-block-host");
  const timerLine = node("cm-line", [
    node("cm-embed-block", [node("markdown-rendered", [timerHost])]),
  ]);
  const gap = node("cm-line", [], "");
  const gymHost = node("atomic-block-host");
  const gymLine = node("cm-line", [
    node("cm-embed-block", [node("markdown-rendered", [gymHost])]),
  ]);
  const content = node("cm-content", [timerLine, gap, gymLine]);
  node("cm-sizer", [content]);
  markSessionEmbed(timerHost, "timer");
  markSessionEmbed(gymHost, "gym-log");
  assert.match(timerLine.className, /atomic-embed-slot-timer/);
  assert.match(gymLine.className, /atomic-embed-slot-gym/);
  assert.match(content.className, /atomic-note-paired/);
  assert.match(gap.className, /atomic-embed-gap/);
});

test("a paragraph between the timer and the gym log keeps them stacked", () => {
  const timerHost = node("atomic-block-host");
  const timerEmbed = node("cm-embed-block", [node("markdown-rendered", [timerHost])]);
  const paragraph = node("cm-line", [], "Notes");
  const gymHost = node("atomic-block-host");
  const gymEmbed = node("cm-embed-block", [node("markdown-rendered", [gymHost])]);
  const content = node("cm-content", [timerEmbed, paragraph, gymEmbed]);
  node("cm-sizer", [content]);
  markSessionEmbed(timerHost, "timer");
  markSessionEmbed(gymHost, "gym-log");
  assert.doesNotMatch(content.className, /atomic-note-paired/);
  assert.doesNotMatch(paragraph.className, /atomic-embed-gap/);
});
