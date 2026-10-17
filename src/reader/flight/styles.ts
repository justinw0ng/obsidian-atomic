// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { COVER_OPEN_MS, FLIGHT_EASE, FLIGHT_MS, FLIP_LEAVES } from "./geometry.ts";

/**
 * Flight sheet injected once into the tap window.
 * Scoped to the body overlay so a reading-view rebuild cannot own it.
 * 1.5.0 tokens: hairline, radii 3 / 9 / 14, Inter + Literata. No purple.
 */
export const OPEN_BOOK_FLIGHT_CSS = `
.atomic-open-flight {
  --atomic-r-object: 3px;
  --atomic-r-control: 9px;
  --atomic-r-well: 14px;
  --atomic-ease: ${FLIGHT_EASE};
  --atomic-ink: var(--text-normal, #222222);
  --atomic-ink-2: var(--text-muted, #5c5c5c);
  --atomic-rule: #e0e0e0;
  --atomic-open-cover: #3d2a1c;
  --atomic-open-ink: #f4ecdf;
  --font-interface: var(--font-interface), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang HK", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  --font-text: "Literata", "Source Serif 4", Georgia, "Iowan Old Style", Palatino, serif;
  position: fixed;
  inset: 0;
  z-index: 90;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
  opacity: 0;
  background: transparent;
  color: var(--atomic-ink);
  font-family: var(--font-interface);
  -webkit-font-smoothing: antialiased;
}
.atomic-open-flight.is-on {
  pointer-events: auto;
  opacity: 1;
}
.atomic-open-blur {
  position: absolute;
  inset: 0;
  background: transparent;
  -webkit-backdrop-filter: blur(0);
  backdrop-filter: blur(0);
}
.atomic-open-flight.is-playing .atomic-open-blur {
  animation: atomic-open-blur ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-open-warm {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 32% 40%, rgba(255, 186, 110, 0.2), transparent 42%),
    radial-gradient(ellipse at 68% 42%, rgba(255, 186, 110, 0.12), transparent 38%);
}
.atomic-open-stage {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  perspective: 1400px;
  transform-style: preserve-3d;
}
.atomic-open-book {
  --from-x: 0px;
  --from-y: 0px;
  --from-s: 0.38;
  --to-x: 0px;
  --to-y: 0px;
  --to-s: 3.15;
  position: relative;
  width: 168px;
  height: 248px;
  transform-style: preserve-3d;
  transform: translate3d(var(--from-x), var(--from-y), 0) scale(var(--from-s));
  transform-origin: 50% 50%;
}
.atomic-open-flight.is-phone .atomic-open-book {
  width: 120px;
  height: 178px;
  --to-s: 2.35;
}
.atomic-open-flight.is-playing .atomic-open-book {
  animation: atomic-open-pop ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-open-flight.is-phone.is-playing .atomic-open-book {
  animation-name: atomic-open-pop-phone;
}
.atomic-open-flight.is-flat.is-playing .atomic-open-book {
  animation-name: atomic-open-flat;
}
.atomic-open-back {
  position: absolute;
  inset: 0;
  z-index: 0;
  border-radius: var(--atomic-r-object);
  background: #efe7d6;
  box-shadow: 0 18px 40px -16px rgba(0, 0, 0, 0.45);
  transform: translateZ(-2px);
}
.atomic-open-leaf {
  position: absolute;
  top: 5%;
  bottom: 5%;
  z-index: 1;
  width: 46%;
  overflow: hidden;
  padding: 8% 6%;
  border-radius: var(--atomic-r-object);
  background: #fffdf8;
  box-shadow: 0 0 0 1px rgba(40, 30, 10, 0.08);
  color: #2b2925;
  font-family: var(--font-text);
  font-size: 9px;
  line-height: 1.4;
}
.atomic-open-leaf.is-left { left: 4%; }
.atomic-open-leaf.is-right { right: 4%; }
.atomic-open-leaf p {
  margin: 0 0 0.55em;
}
.atomic-open-k {
  font-family: var(--font-interface);
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--atomic-ink-2);
}
.atomic-open-gutter {
  position: absolute;
  top: 5%;
  bottom: 5%;
  left: 50%;
  z-index: 2;
  width: 8px;
  transform: translateX(-50%);
  border-radius: var(--atomic-r-object);
  background: linear-gradient(90deg, #e0d8c8, #f5f0e6, #e0d8c8);
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.2);
  pointer-events: none;
}
.atomic-open-stack {
  position: absolute;
  inset: 0;
  z-index: 3;
  transform-style: preserve-3d;
}
.atomic-open-flip {
  position: absolute;
  top: 5%;
  bottom: 5%;
  left: 50%;
  width: 46%;
  border-radius: 0 var(--atomic-r-object) var(--atomic-r-object) 0;
  background: linear-gradient(90deg, #f3ead8, #fffdf8 22%);
  box-shadow: -8px 0 16px -12px rgba(0, 0, 0, 0.35);
  transform-origin: left center;
  transform: rotateY(0deg);
  backface-visibility: hidden;
}
${flipRules()}
.atomic-open-cover {
  position: absolute;
  inset: 0;
  z-index: 4;
  transform-origin: left center;
  transform-style: preserve-3d;
}
.atomic-open-flight.is-playing .atomic-open-cover {
  animation: atomic-open-cover ${COVER_OPEN_MS.duration}ms ${COVER_OPEN_MS.delay}ms var(--atomic-ease) forwards;
}
.atomic-open-flight.is-flat.is-playing .atomic-open-flip {
  animation: none;
}
.atomic-open-flight.is-flat.is-playing .atomic-open-cover {
  animation: atomic-open-cover-fade ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-open-cover-face,
.atomic-open-cover-in {
  position: absolute;
  inset: 0;
  border-radius: var(--atomic-r-object);
  backface-visibility: hidden;
}
.atomic-open-cover-face {
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  gap: 8px;
  padding: 10% 10% 8% 14%;
  background:
    linear-gradient(90deg, rgba(0, 0, 0, 0.28) 0, rgba(255, 255, 255, 0.12) 8%, transparent 14%),
    linear-gradient(180deg, rgba(255, 255, 255, 0.1), transparent 30%),
    var(--atomic-open-cover);
  color: var(--atomic-open-ink);
}
.atomic-open-title {
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.atomic-open-author {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.atomic-open-cover-in {
  background: linear-gradient(90deg, rgba(0, 0, 0, 0.08), transparent 20%), #f3ead8;
  transform: rotateY(180deg);
}
.atomic-open-hint {
  position: absolute;
  left: 50%;
  bottom: 18px;
  transform: translateX(-50%);
  padding: 6px 12px;
  border: 1px solid var(--atomic-rule);
  border-radius: var(--atomic-r-well);
  background: var(--background-primary, #ffffff);
  color: var(--atomic-ink-2);
  font-family: var(--font-interface);
  font-size: 12px;
  font-weight: 500;
  letter-spacing: 0.02em;
  pointer-events: none;
  opacity: 0;
}
.atomic-open-flight.is-on .atomic-open-hint {
  opacity: 1;
}
@keyframes atomic-open-pop {
  0%   { transform: translate3d(var(--from-x), var(--from-y), 0) scale(var(--from-s)); }
  22%  { transform: translate3d(calc(var(--from-x) * 0.45 + var(--to-x) * 0.12), calc(var(--from-y) * 0.4 + var(--to-y) * 0.1 - 18px), 40px) scale(1.15) rotateX(10deg); }
  48%  { transform: translate3d(calc(var(--to-x) * 0.55), calc(var(--to-y) * 0.45 - 8px), 90px) scale(1.85) rotateX(4deg); }
  78%  { transform: translate3d(var(--to-x), var(--to-y), 28px) scale(calc(var(--to-s) * 0.94)); }
  100% { transform: translate3d(var(--to-x), var(--to-y), 0) scale(var(--to-s)); }
}
@keyframes atomic-open-pop-phone {
  0%   { transform: translate3d(var(--from-x), var(--from-y), 0) scale(var(--from-s)); }
  22%  { transform: translate3d(calc(var(--from-x) * 0.4 + var(--to-x) * 0.12), calc(var(--from-y) * 0.35 + var(--to-y) * 0.1 - 10px), 30px) scale(1.2) rotateX(8deg); }
  50%  { transform: translate3d(calc(var(--to-x) * 0.55), calc(var(--to-y) * 0.4 - 6px), 70px) scale(1.7); }
  100% { transform: translate3d(var(--to-x), var(--to-y), 0) scale(var(--to-s)); }
}
@keyframes atomic-open-flat {
  0%   { transform: translate3d(var(--from-x), var(--from-y), 0) scale(var(--from-s)); }
  100% { transform: translate3d(var(--to-x), var(--to-y), 0) scale(var(--to-s)); }
}
@keyframes atomic-open-cover {
  0%   { transform: rotateY(0); }
  100% { transform: rotateY(-168deg); }
}
@keyframes atomic-open-cover-fade {
  0%, 45% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes atomic-open-flip {
  0%   { transform: rotateY(0); }
  100% { transform: rotateY(-178deg); }
}
@keyframes atomic-open-blur {
  0%   { -webkit-backdrop-filter: blur(0); backdrop-filter: blur(0); background: transparent; }
  35%  { -webkit-backdrop-filter: blur(8px); backdrop-filter: blur(8px); }
  80%  { -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); background: color-mix(in srgb, var(--background-primary, #ffffff) 8%, transparent); }
  100% { -webkit-backdrop-filter: blur(0); backdrop-filter: blur(0); background: transparent; }
}
@media (prefers-reduced-motion: reduce) {
  .atomic-open-flight.is-playing .atomic-open-book,
  .atomic-open-flight.is-playing .atomic-open-cover,
  .atomic-open-flight.is-playing .atomic-open-flip,
  .atomic-open-flight.is-playing .atomic-open-blur {
    animation: none;
  }
}
`.trim();

function flipRules(): string {
  return FLIP_LEAVES.map((leaf, index) => {
    const child = index + 1;
    return `.atomic-open-flight.is-playing .atomic-open-flip:nth-child(${child}) { animation: atomic-open-flip ${leaf.duration}ms ${leaf.delay}ms var(--atomic-ease) forwards; }`;
  }).join("\n");
}
