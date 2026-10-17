// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { DEFAULT_READER_SIZE, READER_DESK_TYPE, READER_PHONE_TYPE, READER_SIZE_EASING, READER_SIZE_FRONTMATTER_KEY, READER_SIZE_MOTION_MS, READER_SIZE_ORDER, THEATER_XL_HEIGHT, effectiveReaderSize, isReaderSizeId, parseReaderSize, readerPageGeometry, readerSizeLabel, stepReaderSize, type ReaderPageGeometry, type ReaderSizeId, type ReaderSizeSurface } from "./geometry.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { READER_LINES_CLASS, READER_PAGE_CLASS, READER_SIZE_CLASS, mountReaderSize, type MountReaderSizeOptions, type ReaderSizeControl } from "./mount.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { readerSizeShortcutDirection, type ReaderSizeShortcutDirection } from "./shortcut.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { registerBookSize, resetBookSize, setReaderSizeTheaterLocked, settleReaderSize, type BookSizeHost, type ReaderSizeMemory } from "./shell-bind.ts";
// @ts-expect-error Node test runner resolves .ts extensions; esbuild/tsc use extensionless paths at bundle time
export { readerReflowBox, type ReaderReflowBox } from "./reflow.ts";
