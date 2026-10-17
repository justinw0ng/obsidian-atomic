/**
 * Open Book flight for the reader shell.
 *
 * Paint `.atomic-page` inside `destination` first (the page the reader will
 * show). Copy the cover rect, then call `mountOpenBookFlight` with
 * `openBookFlightView()` so the overlay is on `activeDocument.body`.
 * The flight plays cover lift → hinge → page flips → spread and removes
 * itself on that same page. `prefers-reduced-motion` resolves `"reduced"`
 * immediately and does not build a second layout.
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
  JOURNEY_LANDING_PAGE,
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
