/**
 * Composer for the reader shell. Later workstreams register here.
 * Direct open is the baseline when flight is absent or motion is reduced.
 */
export {
  registerReaderAsk,
  registerReaderFlight,
  registerReaderSize,
  registerReaderTheater,
  resetReaderMounts,
  readerMounts,
  type ReaderAsk,
  type ReaderFlight,
  type ReaderOpenRequest,
  type ReaderSession,
  type ReaderSizeControl,
  type ReaderTheater,
} from "./mount";
export { ATOMIC_READER_VIEW, AtomicReaderView } from "./view";
export { openReaderDirect } from "./open";
