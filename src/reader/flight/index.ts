/**
 * Open Book flight for the reader shell.
 *
 * The shell calls the registered flight from Open Book. The flight opens
 * the live reader, then plays on that leaf: cover, flips, zoom out to scale 1.
 * The snapshot is the settled reader. Reduced motion crossfades.
 */

export {
  COVER_OPEN_MS,
  DESKTOP_BOOK_PX,
  DESKTOP_FALLBACK_SCALE,
  FLIGHT_EASE,
  FLIGHT_MS,
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  REDUCED_FADE_MS,
  PHONE_BOOK_PX,
  PHONE_FALLBACK_SCALE,
  PHONE_LAYOUT_MAX_PX,
  bookPx,
  fallbackScale,
  flightVars,
  flightZoom,
  resolveFlightLayout,
  resolveFlightMotion,
  safeCoverColor,
  unionBoxes,
  type FlightBox,
  type FlightLayout,
  type FlightMotion,
  type FlightVars,
  type FlightZoom,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./geometry.ts";
export {
  spreadFromPainted,
  type OpenBookPage,
  type PaintedPage,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./page.ts";
export {
  OPEN_BOOK_HINT,
  OPEN_BOOK_PAGE_SELECTOR,
  abortOpenBookFlight,
  flightOverlayBody,
  mountOpenBookFlight,
  openBookFlightView,
  readerFrameSignature,
  type OpenBookCover,
  type OpenBookFlightHandle,
  type OpenBookFlightReason,
  type OpenBookFlightRequest,
  type OpenBookLandReason,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./mount.ts";
export {
  playOpenBookFlight,
  registerOpenBookFlight,
  type OpenBookDirectOpen,
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
} from "./register.ts";
