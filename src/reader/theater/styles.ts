// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { SUPPRESS_ACTS, SUPPRESS_CLASSES, SUPPRESS_TESTIDS, THEATER_PAGE_HEIGHT, THEATER_PAGE_WIDTH } from "./rules.ts";

function suppressCss(): string {
  const selectors = [
    ...SUPPRESS_CLASSES.map((name) => `.atomic-theater-root.is-theater .${name}`),
    ...SUPPRESS_ACTS.map((act) => `.atomic-theater-root.is-theater [data-act="${act}"]`),
    ...SUPPRESS_TESTIDS.map((id) => `.atomic-theater-root.is-theater [data-testid="${id}"]`),
  ];
  return `${selectors.join(",\n")} {\n  display: none;\n}\n`;
}

/**
 * Theme-matched theater. Light is linen; dark is a museum room.
 * Injected on the frame's document so a reading-view rebuild cannot drop it
 * with the block. Tokens: hairline, radii 3 / 9 / 14, Inter + Literata.
 */
export const THEATER_CSS = `
/* Hallmark · checked: 2026-10-23 · genre: modern-minimal (inferred)
 * built: the project · redesign: polish · v2.0.0
 * waive 2b · linen key light · theater lock
 * waive 47a · these selectors hide the host title bar · theater lock
 * waive 64 · Esc stays IBM Plex Mono · 1.5.0 token lock */
.atomic-theater-root.is-theater {
  --theater-void: #ebe8e2;
  --theater-paper: #f0eee6;
  --theater-ink: #2a2824;
  --theater-chrome: rgba(251, 250, 247, 0.92);
  --theater-chrome-ink: #3a3834;
  --theater-chrome-shadow: 0 0 0 1px rgba(60, 50, 40, 0.12), 0 10px 24px -12px rgba(60, 50, 40, 0.35);
  --theater-exit: rgba(60, 50, 40, 0.06);
  --theater-hint: #5c5348;
  --theater-mark: #2a45b8;
  --theater-ui: var(--font-interface), Inter, sans-serif;
  --theater-serif: var(--font-text), Literata, Georgia, serif;
  --theater-mono: var(--font-monospace), "IBM Plex Mono", ui-monospace, monospace;
  --theater-linen-verso: linear-gradient(152deg, #fffaf0 0%, #f5f0e4 28%, #f0eee6 58%, #e8e0d0 100%);
  --theater-linen-recto: linear-gradient(208deg, #ebe4d4 0%, #f0ebe0 36%, #e6dfd0 72%, #ddd4c4 100%);
  --theater-phone-page: linear-gradient(152deg, #fffaf0 0%, #f5f0e4 28%, #f0eee6 58%, #e8e0d0 100%);
  --theater-ambient: radial-gradient(ellipse 70% 55% at 38% 32%, rgba(255, 236, 200, 0.5), transparent 70%), radial-gradient(ellipse 50% 45% at 72% 48%, rgba(210, 200, 185, 0.22), transparent 65%), linear-gradient(180deg, #f2efe9 0%, #e5e1d9 55%, #dcd7cf 100%);
  --theater-key: radial-gradient(ellipse at 40% 35%, rgba(255, 220, 160, 0.38), rgba(255, 200, 120, 0.1) 45%, transparent 70%);
  --theater-curtain-l: linear-gradient(90deg, #c8c2b4 0%, #ddd7cb 6%, #b8b0a0 14%, #e4dfd4 22%, #c4bcae 32%, #ebe6dc 42%, #d0cabe 55%, #e8e3d8 70%, #d8d2c4 85%, rgba(232, 227, 216, 0) 100%);
  --theater-curtain-r: linear-gradient(270deg, #c8c2b4 0%, #ddd7cb 6%, #b8b0a0 14%, #e4dfd4 22%, #c4bcae 32%, #ebe6dc 42%, #d0cabe 55%, #e8e3d8 70%, #d8d2c4 85%, rgba(232, 227, 216, 0) 100%);
  --theater-curtain-shadow-l: 6px 0 28px rgba(60, 50, 40, 0.1);
  --theater-curtain-shadow-r: -6px 0 28px rgba(60, 50, 40, 0.1);
  --theater-lamp: radial-gradient(ellipse, rgba(255, 200, 130, 0.22), rgba(255, 186, 110, 0.06) 48%, transparent 74%);
  --theater-verso-shadow: inset 0 1px 0 rgba(255, 252, 240, 0.95), 0 20px 44px -16px rgba(40, 30, 20, 0.34), 0 3px 8px rgba(40, 30, 20, 0.1);
  --theater-recto-shadow: inset 0 1px 0 rgba(255, 246, 220, 0.55), 0 20px 44px -16px rgba(40, 30, 20, 0.3), 0 3px 8px rgba(40, 30, 20, 0.08);
  --theater-phone-shadow: 0 20px 44px -16px rgba(40, 30, 20, 0.34), 0 3px 8px rgba(40, 30, 20, 0.1);
  --page-w: ${THEATER_PAGE_WIDTH}px;
  --page-h: ${THEATER_PAGE_HEIGHT}px;
  --atomic-page-w: ${THEATER_PAGE_WIDTH}px;
  --atomic-page-h: ${THEATER_PAGE_HEIGHT}px;
  --atomic-reader-page-w: ${THEATER_PAGE_WIDTH}px;
  --atomic-reader-page-h: ${THEATER_PAGE_HEIGHT}px;
  --atomic-r-object: 3px;
  --atomic-r-control: 9px;
  --atomic-r-well: 14px;
}
.theme-dark.atomic-theater-root.is-theater,
.theme-dark .atomic-theater-root.is-theater,
body.theme-dark .atomic-theater-root.is-theater {
  --theater-void: #0e0c0a;
  --theater-paper: #f0e8d2;
  --theater-chrome: rgba(38, 38, 38, 0.92);
  --theater-chrome-ink: #dadada;
  --theater-chrome-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1), 0 10px 24px -10px rgba(0, 0, 0, 0.7);
  --theater-exit: rgba(255, 255, 255, 0.06);
  --theater-hint: #c4b5a4;
  --theater-linen-verso: linear-gradient(152deg, #fff6e4 0%, #f5ead4 30%, #f0e8d2 58%, #e4d8c0 100%);
  --theater-linen-recto: linear-gradient(208deg, #d8ceb8 0%, #e6dcc8 34%, #ebe4d4 62%, #ddd2bc 100%);
  --theater-phone-page: linear-gradient(152deg, #fff6e4 0%, #f5ead4 30%, #f0e8d2 58%, #e4d8c0 100%);
  --theater-ambient: radial-gradient(ellipse 65% 50% at 36% 30%, rgba(255, 186, 110, 0.24), transparent 58%), radial-gradient(ellipse 40% 35% at 70% 55%, rgba(120, 90, 60, 0.08), transparent 60%), linear-gradient(180deg, #161310 0%, #0e0c0a 55%, #0a0908 100%);
  --theater-key: radial-gradient(ellipse at 40% 35%, rgba(255, 186, 110, 0.4), rgba(255, 160, 80, 0.12) 42%, transparent 68%);
  --theater-curtain-l: linear-gradient(90deg, #2c2620 0%, #221e1a 8%, #3a322c 16%, #1a1612 28%, #2e2822 40%, #181410 55%, #26201a 72%, rgba(14, 12, 10, 0) 100%);
  --theater-curtain-r: linear-gradient(270deg, #2c2620 0%, #221e1a 8%, #3a322c 16%, #1a1612 28%, #2e2822 40%, #181410 55%, #26201a 72%, rgba(14, 12, 10, 0) 100%);
  --theater-curtain-shadow-l: 8px 0 32px rgba(0, 0, 0, 0.45);
  --theater-curtain-shadow-r: -8px 0 32px rgba(0, 0, 0, 0.45);
  --theater-lamp: radial-gradient(ellipse, rgba(255, 186, 110, 0.36), rgba(255, 150, 70, 0.12) 44%, transparent 72%);
  --theater-verso-shadow: 0 28px 56px -12px rgba(0, 0, 0, 0.78);
  --theater-recto-shadow: 0 28px 56px -12px rgba(0, 0, 0, 0.72);
  --theater-phone-shadow: 0 28px 56px -12px rgba(0, 0, 0, 0.78);
}
.atomic-theater-root.is-theater .atomic-theater-stage {
  position: relative;
  background: var(--theater-void);
  overflow: hidden;
}
.atomic-theater-layers {
  display: contents;
  font-family: var(--theater-ui);
}
.atomic-theater-root.is-theater .th-ambient {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background: var(--theater-ambient);
}
.theme-dark.atomic-theater-root.is-theater .th-ambient,
.theme-dark .atomic-theater-root.is-theater .th-ambient,
body.theme-dark .atomic-theater-root.is-theater .th-ambient {
  background: var(--theater-ambient);
}
.atomic-theater-root.is-theater .th-key {
  position: absolute;
  left: 80px;
  top: 40px;
  width: 520px;
  height: 420px;
  z-index: 2;
  pointer-events: none;
  border-radius: 50%;
  background: var(--theater-key);
}
.theme-dark.atomic-theater-root.is-theater .th-key,
.theme-dark .atomic-theater-root.is-theater .th-key,
body.theme-dark .atomic-theater-root.is-theater .th-key {
  background: var(--theater-key);
}
.atomic-theater-root.is-theater .curtain {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 108px;
  z-index: 3;
  pointer-events: none;
}
.atomic-theater-root.is-theater .curtain.is-l { left: 0; }
.atomic-theater-root.is-theater .curtain.is-r { right: 0; }
.atomic-theater-root.is-theater .curtain.is-l {
  background: var(--theater-curtain-l);
  box-shadow: var(--theater-curtain-shadow-l);
}
.atomic-theater-root.is-theater .curtain.is-r {
  background: var(--theater-curtain-r);
  box-shadow: var(--theater-curtain-shadow-r);
}
.theme-dark.atomic-theater-root.is-theater .curtain.is-l,
.theme-dark .atomic-theater-root.is-theater .curtain.is-l,
body.theme-dark .atomic-theater-root.is-theater .curtain.is-l {
  background: var(--theater-curtain-l);
  box-shadow: var(--theater-curtain-shadow-l);
}
.theme-dark.atomic-theater-root.is-theater .curtain.is-r,
.theme-dark .atomic-theater-root.is-theater .curtain.is-r,
body.theme-dark .atomic-theater-root.is-theater .curtain.is-r {
  background: var(--theater-curtain-r);
  box-shadow: var(--theater-curtain-shadow-r);
}
.atomic-theater-root.is-theater .lamp-pool {
  position: absolute;
  top: 170px;
  width: 140px;
  height: 340px;
  z-index: 4;
  pointer-events: none;
  border-radius: 50%;
  background: var(--theater-lamp);
}
.theme-dark.atomic-theater-root.is-theater .lamp-pool,
.theme-dark .atomic-theater-root.is-theater .lamp-pool,
body.theme-dark .atomic-theater-root.is-theater .lamp-pool {
  background: var(--theater-lamp);
}
.atomic-theater-root.is-theater .lamp-pool.is-l { left: 96px; }
.atomic-theater-root.is-theater .lamp-pool.is-r { right: 96px; }
.atomic-theater-root.is-theater .th-chrome {
  position: absolute;
  left: 50%;
  top: 14px;
  transform: translateX(-50%);
  z-index: 8;
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  padding: 0 6px;
  border-radius: var(--atomic-r-well, 14px);
  background: var(--theater-chrome);
  color: var(--theater-chrome-ink);
  box-shadow: var(--theater-chrome-shadow);
  opacity: 0;
  pointer-events: none;
  transition: opacity 240ms ease;
  white-space: nowrap;
  font-family: var(--theater-ui);
}
.atomic-theater-root.is-theater.is-chrome .th-chrome {
  opacity: 1;
  pointer-events: auto;
}
.atomic-theater-root.is-theater .th-exit {
  height: 28px;
  padding: 0 10px;
  border-radius: var(--atomic-r-control, 9px);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: var(--theater-exit);
  color: inherit;
  font: inherit;
}
.atomic-theater-root.is-theater .th-exit:focus-visible {
  outline: none;
  box-shadow: 0 0 0 2px var(--theater-chrome), 0 0 0 4px var(--theater-mark);
}
.atomic-theater-root.is-theater .th-exit:active {
  background: var(--theater-hint);
  color: var(--theater-void);
}
.atomic-theater-root.is-theater .th-exit .kbd {
  font-family: var(--theater-mono);
  font-size: 11px;
  opacity: 1;
  color: var(--theater-hint);
}
.atomic-theater-root.is-theater .th-hint {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 14px;
  z-index: 6;
  text-align: center;
  pointer-events: none;
  font-family: var(--theater-ui);
  font-size: 12px;
  letter-spacing: 0;
  text-transform: none;
  color: var(--theater-hint);
}
.atomic-theater-root.is-theater .atomic-pane,
.atomic-theater-root.is-theater .atomic-spread,
.atomic-theater-root.is-theater .atomic-reader-spread,
.atomic-theater-root.is-theater .atomic-page,
.atomic-theater-root.is-theater .atomic-reader-page {
  position: relative;
  z-index: 5;
}
.atomic-theater-root.is-theater .atomic-pane {
  padding: 0;
  overflow: hidden;
  background: transparent;
}
.atomic-theater-root.is-theater .atomic-reader {
  background: transparent;
  grid-template-rows: 1fr;
}
.atomic-theater-root.is-theater .atomic-spread {
  grid-template-columns: var(--page-w) var(--page-w);
  gap: 0;
  background: transparent;
  justify-content: center;
  align-items: start;
  padding: 68px 0 28px;
  box-sizing: border-box;
}
.atomic-theater-root.is-theater .atomic-page,
.atomic-theater-root.is-theater .atomic-reader-page {
  margin: 0;
  color: var(--theater-ink);
  width: var(--page-w);
  height: var(--page-h);
  overflow: hidden;
}
.atomic-theater-root.is-theater .atomic-page.is-verso,
.atomic-theater-root.is-theater .atomic-reader-page.is-verso {
  border-radius: var(--atomic-r-object, 3px) 0 0 var(--atomic-r-object, 3px);
  background: var(--theater-linen-verso);
  box-shadow: var(--theater-verso-shadow);
}
.atomic-theater-root.is-theater .atomic-page.is-recto,
.atomic-theater-root.is-theater .atomic-reader-page.is-recto {
  border-radius: 0 var(--atomic-r-object, 3px) var(--atomic-r-object, 3px) 0;
  background: var(--theater-linen-recto);
  box-shadow: var(--theater-recto-shadow);
}
.theme-dark.atomic-theater-root.is-theater .atomic-page.is-verso,
.theme-dark.atomic-theater-root.is-theater .atomic-reader-page.is-verso,
.theme-dark .atomic-theater-root.is-theater .atomic-page.is-verso,
.theme-dark .atomic-theater-root.is-theater .atomic-reader-page.is-verso,
body.theme-dark .atomic-theater-root.is-theater .atomic-page.is-verso,
body.theme-dark .atomic-theater-root.is-theater .atomic-reader-page.is-verso {
  background: var(--theater-linen-verso);
  box-shadow: var(--theater-verso-shadow);
}
.theme-dark.atomic-theater-root.is-theater .atomic-page.is-recto,
.theme-dark.atomic-theater-root.is-theater .atomic-reader-page.is-recto,
.theme-dark .atomic-theater-root.is-theater .atomic-page.is-recto,
.theme-dark .atomic-theater-root.is-theater .atomic-reader-page.is-recto,
body.theme-dark .atomic-theater-root.is-theater .atomic-page.is-recto,
body.theme-dark .atomic-theater-root.is-theater .atomic-reader-page.is-recto {
  background: var(--theater-linen-recto);
  box-shadow: var(--theater-recto-shadow);
}
.atomic-theater-root.is-theater .atomic-page p,
.atomic-theater-root.is-theater .atomic-page h3,
.atomic-theater-root.is-theater .atomic-reader-page p,
.atomic-theater-root.is-theater .atomic-reader-page h3 {
  color: var(--theater-ink);
  font-family: var(--theater-serif);
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .curtain,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .th-key,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .lamp-pool,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .th-hint {
  display: none;
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .th-chrome {
  top: 58px;
  z-index: 9;
  height: 36px;
  max-width: calc(100% - 24px);
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"][data-atomic-theater-place="content"] .th-chrome {
  top: 8px;
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-pane {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-reader {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-spread {
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  width: 100%;
  min-height: 0;
  padding: 48px 16px 20px;
  background: transparent;
}
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-page,
.atomic-theater-root.is-theater.is-phone .atomic-reader-page,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-reader-page {
  width: var(--atomic-page-w, ${THEATER_PAGE_WIDTH}px);
  height: var(--atomic-page-h, ${THEATER_PAGE_HEIGHT}px);
  flex: none;
  margin: 0 auto;
  overflow: hidden;
  border-radius: var(--atomic-r-object, 3px);
  background: var(--theater-phone-page);
  box-shadow: var(--theater-phone-shadow);
  color: var(--theater-ink);
}
.theme-dark.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-page,
.theme-dark.atomic-theater-root.is-theater.is-phone .atomic-reader-page,
.theme-dark .atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-page,
.theme-dark .atomic-theater-root.is-theater.is-phone .atomic-reader-page,
body.theme-dark .atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-page,
body.theme-dark .atomic-theater-root.is-theater.is-phone .atomic-reader-page {
  background: var(--theater-phone-page);
  box-shadow: var(--theater-phone-shadow);
}
html.atomic-theater-dim .titlebar,
html.atomic-theater-dim .workspace-ribbon,
html.atomic-theater-dim .workspace-tab-header-container,
html.atomic-theater-dim .view-header,
html.atomic-theater-dim .status-bar,
html.atomic-theater-dim .ob-titlebar,
html.atomic-theater-dim .ob-ribbon,
html.atomic-theater-dim .ob-viewhead,
html.atomic-theater-dim .ob-mhead,
html.atomic-theater-dim .ob-status,
.atomic-theater-root.is-theater .ob-titlebar,
.atomic-theater-root.is-theater .ob-ribbon,
.atomic-theater-root.is-theater .ob-viewhead,
.atomic-theater-root.is-theater .ob-mhead,
.atomic-theater-root.is-theater .ob-status {
  opacity: 0.58;
  transition: opacity 360ms var(--atomic-ease, cubic-bezier(0.32, 0.72, 0, 1));
}
html.atomic-theater-dim body.theme-dark .titlebar,
html.atomic-theater-dim body.theme-dark .workspace-ribbon,
html.atomic-theater-dim body.theme-dark .workspace-tab-header-container,
html.atomic-theater-dim body.theme-dark .view-header,
html.atomic-theater-dim body.theme-dark .status-bar,
.theme-dark.atomic-theater-root.is-theater .ob-titlebar,
.theme-dark.atomic-theater-root.is-theater .ob-ribbon,
.theme-dark.atomic-theater-root.is-theater .ob-viewhead,
.theme-dark.atomic-theater-root.is-theater .ob-mhead,
.theme-dark.atomic-theater-root.is-theater .ob-status,
.theme-dark .atomic-theater-root.is-theater .ob-titlebar,
.theme-dark .atomic-theater-root.is-theater .ob-ribbon,
.theme-dark .atomic-theater-root.is-theater .ob-viewhead,
.theme-dark .atomic-theater-root.is-theater .ob-mhead,
body.theme-dark .atomic-theater-root.is-theater .ob-titlebar,
body.theme-dark .atomic-theater-root.is-theater .ob-ribbon,
body.theme-dark .atomic-theater-root.is-theater .ob-viewhead,
body.theme-dark .atomic-theater-root.is-theater .ob-mhead {
  opacity: 0.48;
}
html.atomic-theater-dim.atomic-theater-chrome body .titlebar,
html.atomic-theater-dim.atomic-theater-chrome body .workspace-ribbon,
html.atomic-theater-dim.atomic-theater-chrome body .workspace-tab-header-container,
html.atomic-theater-dim.atomic-theater-chrome body .view-header,
html.atomic-theater-dim.atomic-theater-chrome body .status-bar,
html.atomic-theater-dim.atomic-theater-chrome body.theme-dark .titlebar,
html.atomic-theater-dim.atomic-theater-chrome body.theme-dark .workspace-ribbon,
html.atomic-theater-dim.atomic-theater-chrome body.theme-dark .workspace-tab-header-container,
html.atomic-theater-dim.atomic-theater-chrome body.theme-dark .view-header,
html.atomic-theater-dim.atomic-theater-chrome body.theme-dark .status-bar,
html.atomic-theater-dim.atomic-theater-chrome .ob-titlebar,
html.atomic-theater-dim.atomic-theater-chrome .ob-ribbon,
html.atomic-theater-dim.atomic-theater-chrome .ob-viewhead,
html.atomic-theater-dim.atomic-theater-chrome .ob-mhead,
html.atomic-theater-dim.atomic-theater-chrome .ob-status,
.atomic-theater-root.is-theater.is-chrome .ob-titlebar,
.atomic-theater-root.is-theater.is-chrome .ob-ribbon,
.atomic-theater-root.is-theater.is-chrome .ob-viewhead,
.atomic-theater-root.is-theater.is-chrome .ob-mhead,
.atomic-theater-root.is-theater.is-chrome .ob-status {
  opacity: 1;
}
.atomic-theater-root.is-reduced.is-theater .th-chrome,
.atomic-theater-root.is-reduced.is-theater .ob-titlebar,
.atomic-theater-root.is-reduced.is-theater .ob-ribbon,
.atomic-theater-root.is-reduced.is-theater .ob-viewhead,
.atomic-theater-root.is-reduced.is-theater .ob-mhead,
html.atomic-theater-dim.is-reduced .titlebar,
html.atomic-theater-dim.is-reduced .workspace-ribbon,
html.atomic-theater-dim.is-reduced .view-header,
html.atomic-theater-dim.is-reduced .ob-titlebar,
html.atomic-theater-dim.is-reduced .ob-mhead {
  transition: none;
  animation: none;
}
@media (prefers-reduced-motion: reduce) {
  .atomic-theater-root.is-theater .th-chrome,
  .atomic-theater-root.is-theater .ob-titlebar,
  .atomic-theater-root.is-theater .ob-ribbon,
  .atomic-theater-root.is-theater .ob-viewhead,
  .atomic-theater-root.is-theater .ob-mhead,
  html.atomic-theater-dim .titlebar,
  html.atomic-theater-dim .workspace-ribbon,
  html.atomic-theater-dim .view-header {
    transition: none;
    animation: none;
  }
}
.atomic-theater-root.is-theater.atomic-reader {
  background: var(--theater-void);
  grid-template-rows: minmax(0, 1fr);
}
.atomic-theater-root.is-theater .atomic-reader-spread {
  grid-template-columns: var(--atomic-page-w) var(--atomic-page-w);
  justify-content: center;
  align-items: start;
  padding: 68px 0 28px;
  box-sizing: border-box;
  background: transparent;
}
.atomic-theater-root.is-theater .atomic-reader-book {
  width: auto;
  grid-template-columns: var(--atomic-page-w) var(--atomic-page-w);
}
.atomic-theater-root.is-theater.is-phone .atomic-reader-spread,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-reader-spread {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 0;
  padding: 48px 16px 20px;
  background: transparent;
}
.atomic-theater-root.is-theater.is-phone .atomic-reader-book,
.atomic-theater-root.is-theater[data-atomic-theater-surface="phone"] .atomic-reader-book {
  display: flex;
  align-items: center;
  justify-content: center;
  width: auto;
  flex: none;
}
${suppressCss()}
`.trim();
