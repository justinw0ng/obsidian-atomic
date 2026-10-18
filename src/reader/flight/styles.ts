import {
  COVER_EASE,
  COVER_OPEN_MS,
  CURL_EASE,
  FLIGHT_EASE,
  FLIGHT_MS,
  FLIP_LEAVES,
  PAGE_RIBS,
  REDUCED_FADE_MS,
  RIB_STAGGER_MS,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./geometry.ts";

/**
 * In-place flight on the reader leaf.
 * The cover lifts on a spine hinge. Each page is a chain of ribs: the free
 * edge bends first, the spine follows, and the ribs land flat. A quire shows
 * the page block. The camera stays at the settled page, so the land does not
 * shrink or grow. Phone opens that one page from its spine. Desktop opens
 * from the gutter between the two pages. The snapshot drops out onto that
 * same reader, already on that page. Reduced motion is a crossfade, not this flight.
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
  --atomic-flight-paper: var(--atomic-paper, var(--background-primary, #ffffff));
  --flight-from: 1;
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
  transform-style: preserve-3d;
}
.atomic-open-flight.is-playing .atomic-flight-camera {
  animation: atomic-flight-zoom ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-flight-snapshot {
  position: absolute;
  inset: 0;
  z-index: 1;
  width: 100%;
  height: 100%;
  margin: 0;
  pointer-events: none;
}
.atomic-open-flight.is-playing .atomic-flight-snapshot {
  animation: atomic-flight-reveal ${FLIGHT_MS}ms linear forwards;
}
.atomic-flight-veil {
  position: absolute;
  inset: 0;
  z-index: 2;
  background: var(--background-primary, #ffffff);
  pointer-events: none;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-veil {
  animation: atomic-flight-veil ${FLIGHT_MS}ms linear forwards;
}
.atomic-flight-stage {
  position: absolute;
  left: var(--flight-cover-x, 18%);
  top: var(--flight-cover-y, 12%);
  width: var(--flight-cover-w, 64%);
  height: var(--flight-cover-h, 70%);
  z-index: 3;
  perspective: 2200px;
  perspective-origin: 50% 50%;
  transform-style: preserve-3d;
  pointer-events: none;
}
.atomic-flight-volume {
  position: absolute;
  inset: 0;
  transform-origin: 50% 50%;
  transform: translateX(-14%);
  transform-style: preserve-3d;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-volume {
  animation: atomic-flight-volume ${FLIGHT_MS}ms ${COVER_EASE} forwards;
}
.atomic-open-flight.is-flat .atomic-flight-volume {
  transform: none;
}
.atomic-flight-cast {
  position: absolute;
  left: 16%;
  right: 2%;
  bottom: -7%;
  height: 12%;
  border-radius: 50%;
  background: rgba(36, 24, 16, 0.22);
  box-shadow: 0 22px 36px rgba(36, 24, 16, 0.18);
  pointer-events: none;
}
.atomic-flight-sheet {
  position: absolute;
  top: 0;
  width: 50%;
  height: 100%;
  overflow: hidden;
  background: var(--atomic-flight-paper);
  box-shadow: 0 0 0 1px rgba(90, 70, 48, 0.22);
  pointer-events: none;
}
.atomic-flight-sheet.is-left { left: 0; opacity: 0; }
.atomic-flight-sheet.is-right { left: 50%; }
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-sheet.is-left {
  animation: atomic-flight-sheet-left ${FLIGHT_MS}ms linear forwards;
}
.atomic-open-flight .atomic-flight-sheet .atomic-reader-page,
.atomic-open-flight .atomic-flight-sheet .atomic-page {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  box-shadow: none;
}
.atomic-flight-gutter {
  position: absolute;
  left: 50%;
  top: 0;
  width: 36px;
  height: 100%;
  margin-left: -18px;
  opacity: 0;
  background: linear-gradient(90deg, rgba(48, 32, 18, 0), rgba(48, 32, 18, 0.16), rgba(48, 32, 18, 0));
  pointer-events: none;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-gutter {
  animation: atomic-flight-gutter ${FLIGHT_MS}ms linear forwards;
}
.atomic-flight-flips {
  position: absolute;
  left: 50%;
  top: 0;
  width: 50%;
  height: 100%;
  transform-style: preserve-3d;
  pointer-events: none;
}
.atomic-flight-flip {
  position: absolute;
  inset: 0;
  transform-style: preserve-3d;
}
.atomic-flight-contact {
  position: absolute;
  inset: 0;
  opacity: 0;
  background: linear-gradient(90deg, rgba(36, 24, 16, 0) 4%, rgba(36, 24, 16, 0.38) 76%, rgba(36, 24, 16, 0.08));
  pointer-events: none;
}
.atomic-flight-rib {
  position: absolute;
  top: 0;
  left: 0;
  width: ${(100 / PAGE_RIBS).toFixed(4)}%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
}
.atomic-flight-rib .atomic-flight-rib {
  left: 100%;
  width: 100%;
}
.atomic-flight-rib-face,
.atomic-flight-rib-back {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  right: -1px;
  backface-visibility: hidden;
}
.atomic-flight-rib-face {
  background: var(--atomic-flight-paper);
  transform: translateZ(1px);
}
.atomic-flight-flip:not([data-leaf="0"]) .atomic-flight-rib-face {
  background:
    repeating-linear-gradient(180deg, transparent, transparent 22px, rgba(90, 70, 48, 0.14) 22px, rgba(90, 70, 48, 0.14) 23px),
    var(--atomic-flight-paper);
}
.atomic-flight-flip:not([data-leaf="0"]) .atomic-flight-rib-clip {
  opacity: 0;
}
.atomic-flight-paper-edge {
  position: absolute;
  top: 0;
  right: 0;
  width: 5px;
  height: 100%;
  background: linear-gradient(#f4eadc, #d7c6ae 46%, #c4b094);
  box-shadow: inset -1px 0 0 rgba(90, 70, 48, 0.35);
  transform-origin: right center;
  transform: rotateY(90deg);
  pointer-events: none;
}
.atomic-flight-rib-clip {
  position: absolute;
  inset: 0;
  overflow: hidden;
  backface-visibility: hidden;
}
.atomic-flight-rib-back {
  background: #f3eadc;
  transform: rotateY(180deg) translateZ(1px);
}
.atomic-open-flight .atomic-flight-rib-clip .atomic-reader-page,
.atomic-open-flight .atomic-flight-rib-clip .atomic-page {
  position: absolute;
  top: 0;
  left: var(--rib-shift, 0%);
  width: ${PAGE_RIBS * 100}%;
  height: 100%;
  margin: 0;
  box-shadow: none;
}
.atomic-flight-quire {
  position: absolute;
  top: 1.4%;
  width: 16px;
  height: 97.2%;
  pointer-events: none;
  background: linear-gradient(90deg, #efe3d2, #dccab4 72%, #cbb89e);
  box-shadow: inset 0 0 0 1px rgba(90, 70, 48, 0.28);
}
.atomic-flight-quire.is-right {
  right: -14px;
  border-radius: 0 3px 3px 0;
  transform-origin: right center;
}
.atomic-flight-quire.is-left {
  left: calc(50% - 16px);
  border-radius: 3px 0 0 3px;
  opacity: 0;
  transform: scaleX(0.15);
  transform-origin: right center;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-quire.is-right {
  animation: atomic-flight-quire-right ${FLIGHT_MS}ms linear forwards;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-quire.is-left {
  animation: atomic-flight-quire-left ${FLIGHT_MS}ms linear forwards;
}
.atomic-flight-edge {
  position: absolute;
  top: var(--edge-inset, 0px);
  bottom: var(--edge-inset, 0px);
  width: 2px;
  background: var(--atomic-flight-paper);
  box-shadow: inset -1px 0 0 rgba(90, 70, 48, 0.35);
}
.atomic-flight-quire.is-right .atomic-flight-edge { right: var(--edge-x, 0px); }
.atomic-flight-quire.is-left .atomic-flight-edge { left: var(--edge-x, 0px); }
.atomic-flight-cover {
  position: absolute;
  left: 50%;
  top: 0;
  width: 50%;
  height: 100%;
  transform-origin: left center;
  transform-style: preserve-3d;
}
.atomic-open-flight.is-playing .atomic-flight-cover {
  animation: atomic-flight-cover ${COVER_OPEN_MS.duration}ms ${COVER_OPEN_MS.delay}ms linear forwards;
}
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-cover-face,
.atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-cover-in {
  animation: atomic-flight-cover-ink ${FLIGHT_MS}ms linear forwards;
}
.atomic-open-flight.is-flat.is-playing .atomic-flight-cover {
  animation: atomic-flight-cover-fade ${FLIGHT_MS}ms var(--atomic-ease) forwards;
}
.atomic-open-flight.is-flat.is-playing .atomic-flight-veil {
  animation: atomic-flight-cover-fade ${FLIGHT_MS}ms linear forwards;
}
.atomic-flight-cover-face,
.atomic-flight-cover-in,
.atomic-flight-cover-edge {
  position: absolute;
  backface-visibility: hidden;
}
.atomic-flight-cover-face,
.atomic-flight-cover-in {
  inset: 0;
  border-radius: var(--atomic-r-object);
}
.atomic-flight-cover-face {
  transform: translateZ(1px);
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
    inset 0 0 0 11px rgba(244, 236, 223, 0.28),
    0 16px 28px -18px rgba(36, 24, 16, 0.55);
  color: var(--atomic-open-ink);
}
.atomic-flight-cover-edge {
  top: 0;
  right: 0;
  width: 8px;
  height: 100%;
  transform-origin: right center;
  transform: rotateY(90deg);
  background: #2a1c12;
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
  background: #f3eadc;
  box-shadow: inset 0 0 0 1px rgba(90, 70, 48, 0.35);
  transform: rotateY(180deg) translateZ(1px);
}
${flipRules()}
.atomic-open-flight.is-flat .atomic-flight-flip,
.atomic-open-flight.is-flat .atomic-flight-quire,
.atomic-open-flight.is-flat .atomic-flight-gutter,
.atomic-open-flight.is-flat .atomic-flight-cast,
.atomic-open-flight.is-flat .atomic-flight-sheet {
  opacity: 0;
}
.atomic-open-flight.is-flat.is-playing .atomic-flight-flip[data-leaf] .atomic-flight-rib[data-rib],
.atomic-open-flight.is-flat.is-playing .atomic-flight-flip[data-leaf] .atomic-flight-contact {
  animation: none;
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
  0%, 100% { transform: scale(var(--flight-from)); }
}
@keyframes atomic-flight-reveal {
  0%, 99% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes atomic-flight-cover {
  0% { transform: translateZ(16px) rotateY(0deg); }
  30% { transform: translateZ(16px) rotateY(-24deg); }
  58% { transform: translateZ(16px) rotateY(-92deg); }
  82% { transform: translateZ(12px) rotateY(-168deg); }
  100% { transform: translateZ(4px) rotateY(-178deg); }
}
@keyframes atomic-flight-cover-ink {
  0%, 46% { opacity: 1; }
  62%, 100% { opacity: 0; }
}
@keyframes atomic-flight-cover-fade {
  0%, 36% { opacity: 1; }
  100% { opacity: 0; }
}
@keyframes atomic-flight-volume {
  0% { transform: translateX(-14%); }
  36%, 100% { transform: translateX(0%); }
}
.atomic-open-flight.is-settling .atomic-flight-volume {
  opacity: 0;
  transition: opacity 480ms linear;
}
@keyframes atomic-flight-veil {
  0%, 78% { opacity: 1; }
  92%, 100% { opacity: 0; }
}
@keyframes atomic-flight-spine {
  0% { transform: rotateY(0deg); }
  20% { transform: rotateY(-6deg); }
  45% { transform: rotateY(-36deg); }
  75% { transform: rotateY(-130deg); }
  100% { transform: rotateY(-178deg); }
}
@keyframes atomic-flight-leaf-fade {
  0%, 92% { opacity: 1; }
  100% { opacity: 0; }
}
${bendFrames()}
@keyframes atomic-flight-contact {
  0% { opacity: 0; transform: translateX(22%); }
  28% { opacity: 1; transform: translateX(0%); }
  100% { opacity: 0; transform: translateX(-36%); }
}
@keyframes atomic-flight-quire-right {
  0% { transform: scaleX(1); opacity: 1; }
  48% { transform: scaleX(0.8); opacity: 1; }
  74%, 100% { transform: scaleX(0.2); opacity: 0; }
}
@keyframes atomic-flight-quire-left {
  0%, 22% { transform: scaleX(0.15); opacity: 0; }
  58%, 100% { transform: scaleX(1); opacity: 1; }
}
@keyframes atomic-flight-sheet-left {
  0%, 14% { opacity: 0; }
  24%, 100% { opacity: 1; }
}
@keyframes atomic-flight-gutter {
  0%, 18% { opacity: 0; }
  30%, 100% { opacity: 1; }
}
@keyframes atomic-flight-hint {
  0%, 68% { opacity: 1; }
  86%, 100% { opacity: 0; }
}
@keyframes atomic-flight-fade {
  from { opacity: 1; }
  to { opacity: 0; }
}
.atomic-open-flight.is-phone .atomic-flight-volume,
.atomic-open-flight.is-phone.is-playing:not(.is-flat) .atomic-flight-volume {
  transform: none;
  animation: none;
}
.atomic-open-flight.is-phone .atomic-flight-sheet.is-left,
.atomic-open-flight.is-phone .atomic-flight-quire.is-left,
.atomic-open-flight.is-phone .atomic-flight-gutter {
  display: none;
}
.atomic-open-flight.is-phone .atomic-flight-sheet.is-right,
.atomic-open-flight.is-phone .atomic-flight-flips,
.atomic-open-flight.is-phone .atomic-flight-cover {
  left: 0;
  width: 100%;
}
.atomic-open-flight.is-phone .atomic-flight-cover {
  transform-origin: left center;
}
@media (prefers-reduced-motion: reduce) {
  .atomic-open-flight.is-playing .atomic-flight-camera,
  .atomic-open-flight.is-playing .atomic-flight-cover,
  .atomic-open-flight.is-playing:not(.is-flat) .atomic-flight-volume,
  .atomic-open-flight.is-playing .atomic-flight-veil,
  .atomic-open-flight.is-playing .atomic-flight-quire,
  .atomic-open-flight.is-playing .atomic-flight-gutter,
  .atomic-open-flight.is-playing .atomic-flight-flip[data-leaf] .atomic-flight-rib[data-rib],
  .atomic-open-flight.is-playing .atomic-flight-flip[data-leaf] .atomic-flight-contact {
    animation: none;
  }
}
`.trim();

/**
 * Local bend at each joint after the spine.
 * The free edge leads, the middle peaks into a cylinder, then every joint
 * flattens so the leaf can lie on the left page. Same clock as the spine.
 */
function bendFrames(): string {
  const joints = [
    [6, 12, 2],
    [8, 12, 3],
    [10, 13, 3],
    [11, 13, 4],
    [12, 14, 4],
    [13, 14, 5],
    [16, 16, 5],
  ].slice(0, PAGE_RIBS - 1);
  return joints.map((joint, index) => {
    const rib = index + 1;
    const [lead, peak, late] = joint;
    return [
      `@keyframes atomic-flight-bend-${rib} {`,
      `  0% { transform: rotateY(0deg); }`,
      `  20% { transform: rotateY(-${lead}deg); }`,
      `  45% { transform: rotateY(-${peak}deg); }`,
      `  75% { transform: rotateY(-${late}deg); }`,
      `  100% { transform: rotateY(0deg); }`,
      `}`,
    ].join("\n");
  }).join("\n");
}

function flipRules(): string {
  const lines: string[] = [];
  FLIP_LEAVES.forEach((leaf, index) => {
    const clock = `${leaf.duration}ms ${leaf.delay}ms`;
    const shadow = `${leaf.duration}ms ${Math.max(0, leaf.delay - RIB_STAGGER_MS)}ms`;
    const lift = 12 - index * 3;
    lines.push(
      `.atomic-flight-flip[data-leaf="${index}"] { transform: translateZ(${lift}px); }`,
      `.atomic-open-flight.is-playing .atomic-flight-flip[data-leaf="${index}"] .atomic-flight-contact { animation: atomic-flight-contact ${shadow} linear forwards; }`,
      `.atomic-open-flight.is-playing .atomic-flight-flip[data-leaf="${index}"] .atomic-flight-rib-face,`,
      `.atomic-open-flight.is-playing .atomic-flight-flip[data-leaf="${index}"] .atomic-flight-rib-back,`,
      `.atomic-open-flight.is-playing .atomic-flight-flip[data-leaf="${index}"] .atomic-flight-paper-edge { animation: atomic-flight-leaf-fade ${clock} linear forwards; }`,
    );
    for (let rib = 0; rib < PAGE_RIBS; rib += 1) {
      const name = rib === 0 ? "atomic-flight-spine" : `atomic-flight-bend-${rib}`;
      lines.push(
        `.atomic-open-flight.is-playing .atomic-flight-flip[data-leaf="${index}"] .atomic-flight-rib[data-rib="${rib}"] { animation: ${name} ${clock} ${CURL_EASE} forwards; }`,
      );
    }
  });
  return lines.join("\n");
}
