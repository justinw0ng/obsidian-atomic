import test from "node:test";
import assert from "node:assert/strict";
import { rollChars } from "../src/core/digit-roll.ts";
import { appendRoll, playRolls, setRoll } from "../src/views/digit-roll.ts";

test("rollChars maps digits from the right and keeps separators", () => {
  assert.deepEqual(rollChars("192"), [
    { kind: "digit", value: 1, indexFromRight: 2 },
    { kind: "digit", value: 9, indexFromRight: 1 },
    { kind: "digit", value: 2, indexFromRight: 0 },
  ]);
  assert.deepEqual(rollChars("84,480"), [
    { kind: "digit", value: 8, indexFromRight: 5 },
    { kind: "digit", value: 4, indexFromRight: 4 },
    { kind: "glyph", value: "," },
    { kind: "digit", value: 4, indexFromRight: 2 },
    { kind: "digit", value: 8, indexFromRight: 1 },
    { kind: "digit", value: 0, indexFromRight: 0 },
  ]);
  assert.deepEqual(rollChars("2026"), [
    { kind: "digit", value: 2, indexFromRight: 3 },
    { kind: "digit", value: 0, indexFromRight: 2 },
    { kind: "digit", value: 2, indexFromRight: 1 },
    { kind: "digit", value: 6, indexFromRight: 0 },
  ]);
});

function makeEl(className = "") {
  const attrs = {};
  const children = [];
  const classSet = new Set(className.split(/\s+/).filter(Boolean));
  const style = {};
  const el = {
    className,
    children,
    style: {
      setProperty(name, value) {
        style[name] = String(value);
      },
      getPropertyValue(name) {
        return style[name] ?? "";
      },
    },
    classList: {
      contains(name) {
        return classSet.has(name);
      },
      add(name) {
        classSet.add(name);
      },
    },
    dataset: {},
    ownerDocument: {
      defaultView: {
        requestAnimationFrame(fn) {
          fn();
          return 0;
        },
        matchMedia() {
          return { matches: false };
        },
      },
    },
    offsetWidth: 1,
    createSpan(options = {}) {
      const child = makeEl(options.cls ?? "");
      if (options.text != null) child.textContent = String(options.text);
      for (const [key, value] of Object.entries(options.attr ?? {})) {
        child.setAttribute(key, String(value));
      }
      children.push(child);
      return child;
    },
    setCssProps(props) {
      for (const [key, value] of Object.entries(props)) {
        style[key] = String(value);
      }
    },
    empty() {
      children.length = 0;
    },
    replaceChildren(...nodes) {
      children.length = 0;
      children.push(...nodes);
    },
    appendChild(node) {
      children.push(node);
      return node;
    },
    setAttribute(key, value) {
      attrs[key] = String(value);
    },
    getAttribute(key) {
      return attrs[key] ?? null;
    },
    querySelector(sel) {
      if (sel === ".atomic-reel") {
        return children
          .flatMap((child) => [child, ...child.children])
          .find((node) => node.classList.contains("atomic-reel")) ?? null;
      }
      return null;
    },
    querySelectorAll(sel) {
      if (sel === ".atomic-roll") {
        return children.filter((node) => node.classList.contains("atomic-roll"));
      }
      return [];
    },
  };
  let textContent = "";
  Object.defineProperty(el, "textContent", {
    get() {
      if (children.length) {
        return children.map((child) => child.textContent ?? "").join("");
      }
      return textContent;
    },
    set(value) {
      textContent = String(value);
    },
  });
  Object.defineProperty(el, "firstChild", {
    get() {
      return children[0] ?? null;
    },
  });
  return el;
}

test("appendRoll paints clipped reels and keeps the label on the roll", () => {
  const parent = makeEl();
  const roll = appendRoll(parent, "192");
  assert.equal(roll.getAttribute("aria-label"), "192");
  assert.equal(roll.getAttribute("data-testid"), "atomic-roll");
  const digits = roll.children.filter((child) => child.classList.contains("atomic-digit"));
  assert.equal(digits.length, 3);
  assert.equal(digits[0].style.getPropertyValue("--i"), "2");
  assert.equal(digits[1].style.getPropertyValue("--i"), "1");
  assert.equal(digits[2].style.getPropertyValue("--i"), "0");
  const ones = digits[2];
  const reel = ones.children
    .flatMap((child) => child.children)
    .find((node) => node.classList.contains("atomic-reel"));
  assert.ok(reel);
  assert.equal(reel.style.getPropertyValue("--d") || Object.values(reel.style)[0], "2");
});

test("setRoll with animate starts new digits at 0 then applies the target", () => {
  const parent = makeEl();
  const roll = appendRoll(parent, "40");
  setRoll(roll, "53", true);
  assert.equal(roll.getAttribute("aria-label"), "53");
  const digits = roll.children.filter((child) => child.classList.contains("atomic-digit"));
  assert.equal(digits.length, 2);
  const onesReel = digits[1].children
    .flatMap((child) => child.children)
    .find((node) => node.classList.contains("atomic-reel"));
  assert.equal(onesReel.style.getPropertyValue("--d"), "3");
});

test("playRolls restarts every roll on the root from the existing label", () => {
  const root = makeEl();
  appendRoll(root, "171");
  playRolls(root);
  const roll = root.children[0];
  assert.equal(roll.getAttribute("aria-label"), "171");
  const digits = roll.children.filter((child) => child.classList.contains("atomic-digit"));
  assert.equal(digits.length, 3);
});
