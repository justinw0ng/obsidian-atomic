// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_CSS } from "./styles.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_IDLE_MS, THEATER_PAGE_HEIGHT, THEATER_PAGE_WIDTH, resolveTheaterSurface, shouldSuppressControl, type TheaterSurface } from "./rules.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { isTheaterOn, mountTheater, type MountTheaterOptions, type TheaterClock, type TheaterHandle } from "./mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { attachReaderTheater, resetReaderTheater, type TheaterSlotCopy, type TheaterSlotSession } from "./slot.ts";

export { THEATER_CSS };
export {
  THEATER_IDLE_MS,
  THEATER_PAGE_HEIGHT,
  THEATER_PAGE_WIDTH,
  resolveTheaterSurface,
  shouldSuppressControl,
};
export { isTheaterOn, mountTheater };
export { attachReaderTheater, resetReaderTheater };
export type { TheaterSurface, MountTheaterOptions, TheaterClock, TheaterHandle, TheaterSlotCopy, TheaterSlotSession };
