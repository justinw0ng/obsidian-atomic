import test from "node:test";
import assert from "node:assert/strict";
import {
  CUE_CARD_FAN_WIDTH_PX,
  CUE_CARD_FLY_INSET_PX,
  CUE_CARD_FLY_MAX_SCALE,
  CUE_CARD_INTERACTIVE_SELECTOR,
  cueCardEventFromInteractive,
  cueCardEventShouldToggle,
  cueCardFlyScale,
  cueLightboxLayoutWidth,
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

test("cueCardFlyScale enlarges the same paper and caps to the viewport", () => {
  const paper = { width: CUE_CARD_FAN_WIDTH_PX };
  assert.equal(cueCardFlyScale(paper, { innerWidth: 1600 }), CUE_CARD_FLY_MAX_SCALE);
  assert.equal(
    cueCardFlyScale(paper, { innerWidth: 390 }),
    (390 - CUE_CARD_FLY_INSET_PX) / CUE_CARD_FAN_WIDTH_PX,
  );
  assert.equal(
    cueCardFlyScale({ width: CUE_CARD_FAN_WIDTH_PX }, { innerWidth: 400 }),
    (400 - CUE_CARD_FLY_INSET_PX) / CUE_CARD_FAN_WIDTH_PX,
  );
});

test("cueLightboxLayoutWidth grows with the cue and stays inside the scaled viewport", () => {
  const desktop = { innerWidth: 1600 };
  assert.equal(cueLightboxLayoutWidth(100, desktop, CUE_CARD_FLY_MAX_SCALE), CUE_CARD_FAN_WIDTH_PX);
  assert.equal(cueLightboxLayoutWidth(800, desktop, CUE_CARD_FLY_MAX_SCALE), 800);
  assert.equal(
    cueLightboxLayoutWidth(1400, desktop, CUE_CARD_FLY_MAX_SCALE),
    (1600 - CUE_CARD_FLY_INSET_PX) / CUE_CARD_FLY_MAX_SCALE,
  );
  const phoneScale = (390 - CUE_CARD_FLY_INSET_PX) / CUE_CARD_FAN_WIDTH_PX;
  assert.equal(
    cueLightboxLayoutWidth(800, { innerWidth: 390 }, phoneScale),
    CUE_CARD_FAN_WIDTH_PX,
  );
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
