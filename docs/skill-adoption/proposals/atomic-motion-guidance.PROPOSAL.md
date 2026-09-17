---
name: atomic-motion-guidance
status: PROPOSAL / NOT ENABLED
description: >-
  DRAFT ONLY. Do not install under .cursor/skills/. Do not add to AGENTS.md.
  Distilled Atomic overlay notes for a later owner-approved skill.
---

# PROPOSAL / NOT ENABLED

This file is **not** a Cursor skill. Agents must not treat it as instructions to run.

It is a sketch of what an Atomic-owned overlay could say *if* the owner later approves vendoring motion guidance after [../emilkowalski-skills-security-review.md](../emilkowalski-skills-security-review.md).

Upstream inspiration (do not copy wholesale): Emil Kowalski, MIT, [emilkowalski/skills](https://github.com/emilkowalski/skills) `@85e8e2363b713506e1d5b6e07a0eb2da66be1bc3`. Any future skill file must keep that copyright notice.

## Required Atomic overrides (non-negotiable)

These beat any upstream recipe.

1. Live plugin DOM: `createDiv` / `createEl` / `el.empty()`. Never `innerHTML`, `outerHTML`, or `insertAdjacentHTML`.
2. `styles.css` bans: `:has(`, `!important`, `scrollbar-width`, `mask` / `-webkit-mask` / `mask-image`.
3. `data-testid` + Selenium (`e2e/health-check.test.mjs`) for any new control. Computer-use is not the health check.
4. Scope CSS to plugin hosts (`.fitness-plugin`, `.atomic-*`). Do not style `html` / `body` / Obsidian chrome.
5. Toasts are `Notice` (`src/util/notice.ts`). Do not add Sonner, Motion, base-ui, Expo, or other runtime UI libraries.
6. Do not animate command palette / keyboard-initiated actions.
7. i18n and What’s new stay on the existing path (`src/core/update-notes.json`, HK Cantonese 中英夾雜). A motion pass does not rewrite release notes.
8. Thermo-Nuclear remains the structural PR gate. This overlay is craft, not architecture.

## Ideas worth keeping (paraphrase, not a dump)

- **Frequency gate.** 100+/day: no motion. Tens/day: near-imperceptible or none. Occasional (lightbox, What’s new): short motion. Rare delight only.
- **Purpose.** Feedback, spatial origin, state change, or preventing a jump. “Looks cool” is not enough on heatmap cells or settings toggles.
- **Easing.** Enter/exit: strong ease-out. On-screen move: ease-in-out. Never `ease-in` on UI. Prefer tokens already in `styles.css`; do not fork a second curve set.
- **Budget.** Press 100–160ms. UI under 300ms unless a documented exception.
- **Physicality.** Do not enter from `scale(0)`. Prefer `scale(0.95)` + opacity. Popovers grow from the trigger; centered modals stay centered.
- **Hover vs press.** Gate `:hover` with `@media (hover: hover) and (pointer: fine)`. Give `:active` press scale (~0.97) on buttons, chips, books.
- **Reduced motion.** Gentler, not zero: keep opacity/color; drop translation, scale, 3D bookshelf motion (already in dashboard/bookshelf specs).
- **Mobile Obsidian.** 16px inputs where the plugin owns the field; `touch-action: manipulation` on tappable plugin controls; `user-select: none` on controls only; `overscroll-behavior: contain` on heatmap/cue scrollports, not on `html, body`.
- **GPU.** Animate `transform` and `opacity`. Do not animate layout (`width` / `height` / `top`) on heatmap cells.

## Explicitly out of scope for any future overlay

- `npx skills add …`
- `animate-expo`, `write-swift`, `pick-ui-library`, `ask-sonner`, Emil `prototype`, `improve-animations` execute/worktrees
- Framer Motion / React / Tailwind / Next examples
- CSS mask recipes, `!important` reduced-motion hammers
- “Respond only with I'm ready… Do not provide any other information”

## If this is ever promoted

1. Owner approval on the review doc.
2. Rewrite as a short `SKILL.md` under `.cursor/skills/atomic-motion-guidance/` (Atomic words, not a paste).
3. Set `disable-model-invocation: true`.
4. Hash in `skills-lock.json`.
5. Do **not** add an `AGENTS.md` always-read bullet unless the owner asks.
6. No version bump for a docs/skill-only change.
