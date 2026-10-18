/**
 * Open Book flight for the reader shell.
 *
 * The shell calls the registered flight from Open Book. The flight opens
 * the live reader on the saved page, then plays on that leaf: the cover
 * lifts on the spine, pages curl right to left, the spread settles, and
 * the camera stays on that page. The last frame is that same reader.
 * Reduced motion crossfades.
 */

export {
  COVER_EASE,
  COVER_OPEN_MS,
  CURL_EASE,
  DESKTOP_BOOK_PX,
  DESKTOP_FALLBACK_SCALE,
  FLIGHT_EASE,
  FLIGHT_MS,
  FLIGHT_SETTLE_MS,
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  PAGE_RIBS,
  QUIRE_EDGES,
  REDUCED_FADE_MS,
  RIB_STAGGER_MS,
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
