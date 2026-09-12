import test from "node:test";
import assert from "node:assert/strict";
import {
  CUE_CARD_INTERACTIVE_SELECTOR,
  cueCardEventFromInteractive,
  cueCardEventShouldToggle,
  isCueCardToggleKey,
  isCueLightboxDismissKey,
} from "../src/util/cue-card-fan.ts";

const card = { id: "card" };
const link = { id: "link" };

function target(found) {
  return {
    closest(selector) {
      assert.equal(selector, CUE_CARD_INTERACTIVE_SELECTOR);
      return found;
    },
  };
}

test("isCueCardToggleKey is only Enter and Space", () => {
  assert.equal(isCueCardToggleKey("Enter"), true);
  assert.equal(isCueCardToggleKey(" "), true);
  assert.equal(isCueCardToggleKey("Spacebar"), false);
  assert.equal(isCueCardToggleKey("Escape"), false);
  assert.equal(isCueCardToggleKey("Tab"), false);
});

test("isCueLightboxDismissKey is only Escape", () => {
  assert.equal(isCueLightboxDismissKey("Escape"), true);
  assert.equal(isCueLightboxDismissKey("Enter"), false);
  assert.equal(isCueLightboxDismissKey(" "), false);
  assert.equal(isCueLightboxDismissKey("Tab"), false);
});

test("the interactive selector covers markdown links and nested controls", () => {
  assert.match(CUE_CARD_INTERACTIVE_SELECTOR, /a\[href]/);
  assert.match(CUE_CARD_INTERACTIVE_SELECTOR, /a\.internal-link/);
  assert.match(CUE_CARD_INTERACTIVE_SELECTOR, /button/);
  assert.match(CUE_CARD_INTERACTIVE_SELECTOR, /\[role='link']/);
  assert.match(CUE_CARD_INTERACTIVE_SELECTOR, /\[role='button']/);
});

test("events from a link or other control inside the card do not toggle", () => {
  assert.equal(cueCardEventFromInteractive(target(link), card), true);
  assert.equal(cueCardEventShouldToggle(target(link), card), false);
});

test("events from the card itself still toggle", () => {
  assert.equal(cueCardEventFromInteractive(target(card), card), false);
  assert.equal(cueCardEventShouldToggle(target(card), card), true);
  assert.equal(cueCardEventShouldToggle(target(null), card), true);
});

test("text-node targets walk to a parent that can closest()", () => {
  const text = { parentElement: target(link) };
  assert.equal(cueCardEventShouldToggle(text, card), false);
  assert.equal(cueCardEventShouldToggle({ parentElement: target(card) }, card), true);
});
