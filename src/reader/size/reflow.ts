// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageBox } from "../shell/model.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
import { readerPageGeometry, type ReaderSizeId } from "./geometry.ts";

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

/**
 * Page box for `paginateReaderBlocks`.
 * Line count is the journey clip. Character width stays the shell's.
 */
export function readerReflowBox(size: ReaderSizeId, theaterLocked: boolean): ReaderReflowBox {
  const drawn = readerPageGeometry(size, { theater: theaterLocked, surface: "desk" });
  const shell = readerPageBox(drawn.size);
  return {
    size,
    width: drawn.width,
    height: drawn.height,
    bodyLines: drawn.lines,
    charsPerLine: shell.charsPerLine,
  };
}
