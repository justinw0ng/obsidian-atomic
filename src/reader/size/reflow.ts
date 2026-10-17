// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageBox } from "../shell/model.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { THEATER_XL_HEIGHT, effectiveReaderSize, type ReaderSizeId } from "./geometry.ts";

/** What the shell paginator needs for the size currently on screen. */
export type ReaderReflowBox = {
  /** Settled size. Theater does not replace this with XL. */
  size: ReaderSizeId;
  width: number;
  height: number;
  /** Whole lines inside the page. M is 15, XL is 22, theater XL is 23. */
  bodyLines: number;
  charsPerLine: number;
};

/** Page box for `paginateReaderBlocks`. Width, height, and lines come from `readerPageBox`. */
export function readerReflowBox(size: ReaderSizeId, theaterLocked: boolean): ReaderReflowBox {
  const drawn = effectiveReaderSize(size, theaterLocked);
  const box = readerPageBox(drawn, theaterLocked ? THEATER_XL_HEIGHT : undefined);
  return {
    size,
    width: box.w,
    height: box.h,
    bodyLines: box.bodyLines,
    charsPerLine: box.charsPerLine,
  };
}
