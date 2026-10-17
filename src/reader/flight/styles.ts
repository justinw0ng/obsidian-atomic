// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { COVER_OPEN_MS, FLIGHT_EASE, FLIGHT_MS, FLIP_LEAVES, REDUCED_FADE_MS } from "./geometry.ts";

/**
 * In-place flight on the reader leaf.
 * The camera is a snapshot of the settled reader. It starts zoomed in,
 * the cover and flips play on that snapshot, then the camera zooms out
 * to scale 1. The last frame is that snapshot with no transform.
 * Reduced motion is a crossfade, not this flight.
 * 1.5.0 tokens. No black stage. No purple.
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
  --flight-from: 1.8;
  --flight-ox: 50%;
  --flight-oy: 46%;
  --font-interface: var(--font-interface), "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang HK", "Noto Sans TC", "Microsoft JhengHei", sans-serif;
  --font-text: "Literata", "Source Serif 4", Georgia, "Iowan Old Style", Palatino, serif;
  position: absolute;
  inset: 0;
  z-index: 40;
  margin: 0;
  overflow: hidden;
  pointer-events: none;
  background: transparent;
  color: var(--atomic-ink);
  font-family: var(--font-interface);
}
.atomic-open-flight.is-on {
  pointer-events: auto;
}
.atomic-flight-camera {
  position: absolute;
  inset: 0;
  transform-origin: var(--flight-ox) var(--flight-oy);
  transform: scale(var(--flight-from));
}
.atomic-open-flight.is-playing .atomic-flight-camera {
  animation: atomic-flight-zoom ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-flight-snapshot {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  pointer-events: none;
}
.atomic-flight-cover,
.atomic-flight-flips {
  position: absolute;
  pointer-events: none;
}
.atomic-flight-cover {
  left: var(--flight-cover-x, 18%);
  top: var(--flight-cover-y, 12%);
  width: var(--flight-cover-w, 64%);
  height: var(--flight-cover-h, 70%);
  z-index: 4;
  transform-origin: left center;
  transform-style: preserve-3d;
}
.atomic-flight-flips {
  left: var(--flight-recto-x, 50%);
  top: var(--flight-recto-y, 12%);
  width: var(--flight-recto-w, 32%);
  height: var(--flight-recto-h, 70%);
  z-index: 3;
}
.atomic-open-flight.is-playing .atomic-flight-cover {
  animation: atomic-flight-cover ${COVER_OPEN_MS.duration}ms ${COVER_OPEN_MS.delay}ms var(--atomic-ease) forwards;
}
.atomic-open-flight.is-flat.is-playing .atomic-flight-cover {
  animation: atomic-flight-cover-fade ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-flight-cover-face,
.atomic-flight-cover-in {
  position: absolute;
  inset: 0;
  border-radius: var(--atomic-r-object);
  backface-visibility: hidden;
}
.atomic-flight-cover-face {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14%;
  text-align: center;
  background-color: var(--atomic-open-cover);
  background-image: linear-gradient(90deg, rgba(0, 0, 0, 0.22), transparent 14%);
  box-shadow:
    inset 0 0 0 1px rgba(244, 236, 223, 0.45),
    inset 0 0 0 10px var(--atomic-open-cover),
    inset 0 0 0 11px rgba(244, 236, 223, 0.28);
  color: var(--atomic-open-ink);
}
.atomic-flight-title {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.15;
}
.atomic-flight-author {
  font-size: 11px;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  opacity: 0.7;
}
.atomic-flight-cover-in {
  background: var(--atomic-paper, var(--background-primary, #ffffff));
  transform: rotateY(180deg);
}
.atomic-flight-flip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 0 var(--atomic-r-object) var(--atomic-r-object) 0;
  background: var(--atomic-paper, var(--background-primary, #ffffff));
  box-shadow: -8px 0 16px -12px rgba(0, 0, 0, 0.35);
  transform-origin: left center;
  backface-visibility: hidden;
}
.atomic-flight-flip .atomic-reader-page,
.atomic-flight-flip .atomic-page {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  box-shadow: none;
}
${flipRules()}
.atomic-open-flight.is-flat.is-playing .atomic-flight-flip {
  animation: none;
  opacity: 0;
}
.atomic-open-hint {
  position: absolute;
  left: 50%;
  bottom: 18px;
  z-index: 5;
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
.atomic-open-flight.is-playing .atomic-open-hint {
  animation: atomic-flight-hint ${FLIGHT_MS}ms linear forwards;
}
.atomic-open-flight.is-reduced {
  background: var(--background-primary, #ffffff);
  animation: atomic-flight-fade ${REDUCED_FADE_MS}ms ease forwards;
}
@keyframes atomic-flight-zoom {
  0%, 82% { transform: scale(var(--flight-from)); }
  100% { transform: scale(1); }
}
@keyframes atomic-flight-cover {
  0% { transform: rotateY(0deg); opacity: 1; }
  72% { transform: rotateY(-168deg); opacity: 1; }
  100% { transform: rotateY(-178deg); opacity: 0; }
}
@keyframes atomic-flight-cover-fade {
  0%, 36% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes atomic-flight-flip {
  0% { transform: rotateY(0deg); opacity: 1; }
  80% { transform: rotateY(-178deg); opacity: 1; }
  100% { transform: rotateY(-178deg); opacity: 0; }
}
@keyframes atomic-flight-hint {
  0%, 68% { opacity: 1; }
  86%, 100% { opacity: 0; }
}
@keyframes atomic-flight-fade {
  from { opacity: 1; }
  to { opacity: 0; }
}
@media (prefers-reduced-motion: reduce) {
  .atomic-open-flight.is-playing .atomic-flight-camera,
  .atomic-open-flight.is-playing .atomic-flight-cover,
  .atomic-open-flight.is-playing .atomic-flight-flip {
    animation: none;
  }
}
`.trim();

function flipRules(): string {
  return FLIP_LEAVES.map((leaf, index) => {
    const child = index + 1;
    return `.atomic-open-flight.is-playing .atomic-flight-flip:nth-child(${child}) { animation: atomic-flight-flip ${leaf.duration}ms ${leaf.delay}ms var(--atomic-ease) forwards; }`;
  }).join("\n");
}
