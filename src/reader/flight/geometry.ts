/** Cover-to-page geometry for the Open Book flight. Matches the mock's `applyFlight`. */

export type FlightBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type FlightLayout = "desktop" | "phone";

/** Desktop 3D, phone 3D, coarse-pointer scale-and-fade, or an instant open. */
export type FlightMotion = "desktop" | "phone" | "flat" | "reduced";

export type FlightVars = {
  fromX: string;
  fromY: string;
  fromS: string;
  toX: string;
  toY: string;
  toS: string;
};

/** Miniature flying book. The settled page is a different element underneath. */
export const DESKTOP_BOOK_PX = { width: 168, height: 248 } as const;
export const PHONE_BOOK_PX = { width: 120, height: 178 } as const;

/** Mock defaults when the live page rect is not ready yet. */
export const DESKTOP_FALLBACK_SCALE = 3.15;
export const PHONE_FALLBACK_SCALE = 2.35;

/** Whole flight. The overlay lifts 50ms after the zoom-out ends. */
export const FLIGHT_MS = 1400;
export const FLIGHT_SKIP_MS = 1450;
export const REDUCED_FADE_MS = 280;
export const FLIGHT_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";

export const COVER_OPEN_MS = { duration: 900, delay: 180 } as const;

/** Five leaves. An opaque turn, not a see-through page. */
export const FLIP_LEAVES = [
  { duration: 220, delay: 420 },
  { duration: 200, delay: 560 },
  { duration: 180, delay: 690 },
  { duration: 180, delay: 810 },
  { duration: 200, delay: 930 },
] as const;

/** A viewport this narrow uses the phone book. The shell can still pass a layout. */
export const PHONE_LAYOUT_MAX_PX = 480;

const SAFE_COLOR =
  /^(#[0-9a-f]{3,8}|rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}(?:\s*,\s*(?:0|1|0?\.\d+))?\s*\)|[a-z]{1,24})$/i;

export function bookPx(layout: FlightLayout): { width: number; height: number } {
  switch (layout) {
    case "phone":
      return PHONE_BOOK_PX;
    case "desktop":
      return DESKTOP_BOOK_PX;
    default: {
      const never: never = layout;
      return never;
    }
  }
}

export function fallbackScale(layout: FlightLayout): number {
  switch (layout) {
    case "phone":
      return PHONE_FALLBACK_SCALE;
    case "desktop":
      return DESKTOP_FALLBACK_SCALE;
    default: {
      const never: never = layout;
      return never;
    }
  }
}

export function resolveFlightLayout(
  explicit: FlightLayout | undefined,
  viewportWidth: number,
): FlightLayout {
  if (explicit === "phone" || explicit === "desktop") return explicit;
  if (viewportWidth > 0 && viewportWidth <= PHONE_LAYOUT_MAX_PX) return "phone";
  return "desktop";
}

export function resolveFlightMotion(input: {
  reducedMotion: boolean;
  coarsePointer: boolean;
  layout: FlightLayout;
}): FlightMotion {
  if (input.reducedMotion) return "reduced";
  if (input.coarsePointer) return "flat";
  switch (input.layout) {
    case "phone":
      return "phone";
    case "desktop":
      return "desktop";
    default: {
      const never: never = input.layout;
      return never;
    }
  }
}

export function safeCoverColor(value: string | undefined): string | null {
  if (!value) return null;
  const color = value.trim();
  if (!SAFE_COLOR.test(color)) return null;
  return color;
}

export function unionBoxes(boxes: readonly FlightBox[]): FlightBox | null {
  const visible = boxes.filter((box) => box.width > 0 && box.height > 0);
  const first = visible[0];
  if (!first) return null;
  let left = first.x;
  let top = first.y;
  let right = first.x + first.width;
  let bottom = first.y + first.height;
  for (const box of visible.slice(1)) {
    left = Math.min(left, box.x);
    top = Math.min(top, box.y);
    right = Math.max(right, box.x + box.width);
    bottom = Math.max(bottom, box.y + box.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/**
 * Map a cover rect onto the live page spread.
 * Leaves sit inside 92% of the book width and 90% of its height, same as the mock.
 */
export function flightVars(input: {
  from: FlightBox;
  dest: FlightBox | null;
  host: { width: number; height: number };
  book: { width: number; height: number };
  fallbackToScale: number;
}): FlightVars {
  const bookW = input.book.width > 0 ? input.book.width : DESKTOP_BOOK_PX.width;
  const bookH = input.book.height > 0 ? input.book.height : DESKTOP_BOOK_PX.height;
  const fromCx = input.from.x + input.from.width / 2;
  const fromCy = input.from.y + input.from.height / 2;
  const vars: FlightVars = {
    fromX: px(fromCx - input.host.width / 2),
    fromY: px(fromCy - input.host.height / 2),
    fromS: (input.from.width / bookW).toFixed(3),
    toX: "0px",
    toY: "0px",
    toS: input.fallbackToScale.toFixed(3),
  };
  if (!input.dest) return vars;
  const destCx = input.dest.x + input.dest.width / 2;
  const destCy = input.dest.y + input.dest.height / 2;
  vars.toX = px(destCx - input.host.width / 2);
  vars.toY = px(destCy - input.host.height / 2);
  vars.toS = Math.min(
    input.dest.width / (bookW * 0.92),
    input.dest.height / (bookH * 0.9),
  ).toFixed(3);
  return vars;
}

function px(value: number): string {
  return `${value}px`;
}

export type FlightZoom = {
  originX: string;
  originY: string;
  fromScale: string;
  coverX: string;
  coverY: string;
  coverW: string;
  coverH: string;
};

/**
 * Zoom out onto the settled reader.
 * The camera starts large enough that the spread fills the leaf, then ends at scale 1.
 */
export function flightZoom(input: {
  host: FlightBox;
  spread: FlightBox | null;
}): FlightZoom {
  const fallback: FlightZoom = {
    originX: "50%",
    originY: "46%",
    fromScale: "1.800",
    coverX: "18%",
    coverY: "12%",
    coverW: "64%",
    coverH: "70%",
  };
  if (input.host.width <= 0 || input.host.height <= 0 || !input.spread) return fallback;
  const localX = input.spread.x - input.host.x;
  const localY = input.spread.y - input.host.y;
  const cx = ((localX + input.spread.width / 2) / input.host.width) * 100;
  const cy = ((localY + input.spread.height / 2) / input.host.height) * 100;
  const fill = Math.min(
    input.host.width / input.spread.width,
    input.host.height / input.spread.height,
  );
  const from = Math.max(1.15, Math.min(2.6, fill));
  return {
    originX: `${clampPercent(cx)}%`,
    originY: `${clampPercent(cy)}%`,
    fromScale: from.toFixed(3),
    coverX: px(localX),
    coverY: px(localY),
    coverW: px(input.spread.width),
    coverH: px(input.spread.height),
  };
}

function clampPercent(value: number): string {
  const next = Math.max(0, Math.min(100, value));
  return next.toFixed(2);
}
