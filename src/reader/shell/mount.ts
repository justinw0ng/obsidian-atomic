import type { ReaderSizeId } from "./model.ts";

export type CoverRect = {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
};

/** What the shell hands a later module when Open Book runs. */
export type ReaderOpenRequest = {
  notePath: string;
  filePath: string;
  title: string;
  kind: "epub" | "pdf";
  returnPath: string;
  coverRect: CoverRect | null;
};

/** Ask the open reader to paginate again for the box on screen. */
export type ReaderLayoutRequest = {
  /** Settled size. Theater leaves this alone and only changes the box. */
  size: ReaderSizeId;
  width: number;
  height: number;
  bodyLines: number;
  charsPerLine: number;
};

export type ReaderSession = ReaderOpenRequest & {
  page: number;
  total: number;
  size: ReaderSizeId;
  relayout?(request: ReaderLayoutRequest): void;
};

export type ReaderFlight = {
  /**
   * Play the open. Return true if this module reveals the reader itself.
   * Return false and the shell opens directly.
   */
  open(request: ReaderOpenRequest): Promise<boolean> | boolean;
};

export type ReaderTheater = {
  attach?(slot: HTMLElement, session: ReaderSession): void;
};

export type ReaderSizeControl = {
  attach?(slot: HTMLElement, session: ReaderSession): void;
};

export type ReaderAsk = {
  attach?(slot: HTMLElement, session: ReaderSession): void;
};

export type ReaderMounts = {
  flight?: ReaderFlight;
  theater?: ReaderTheater;
  size?: ReaderSizeControl;
  ask?: ReaderAsk;
};

const mounts: ReaderMounts = {};

export function registerReaderFlight(flight: ReaderFlight): void {
  mounts.flight = flight;
}

export function registerReaderTheater(theater: ReaderTheater): void {
  mounts.theater = theater;
}

export function registerReaderSize(size: ReaderSizeControl): void {
  mounts.size = size;
}

export function registerReaderAsk(ask: ReaderAsk): void {
  mounts.ask = ask;
}

export function readerMounts(): ReaderMounts {
  return mounts;
}

export function resetReaderMounts(): void {
  delete mounts.flight;
  delete mounts.theater;
  delete mounts.size;
  delete mounts.ask;
}
