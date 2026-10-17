/**
 * Open Book flight for the reader shell.
 *
 * The shell calls the registered flight from Open Book. Full motion opens
 * the live reader, then plays the overlay on `activeDocument.body` onto
 * `.atomic-reader-page`. Reduced motion returns false so the shell opens
 * directly and does not build a second layout.
 */

export {
  COVER_OPEN_MS,
  DESKTOP_BOOK_PX,
  DESKTOP_FALLBACK_SCALE,
  FLIGHT_EASE,
  FLIGHT_MS,
  FLIGHT_SKIP_MS,
  FLIP_LEAVES,
  PHONE_BOOK_PX,
  PHONE_FALLBACK_SCALE,
  PHONE_LAYOUT_MAX_PX,
  bookPx,
  fallbackScale,
  flightVars,
  resolveFlightLayout,
  resolveFlightMotion,
  safeCoverColor,
  unionBoxes,
  type FlightBox,
  type FlightLayout,
  type FlightMotion,
  type FlightVars,
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
