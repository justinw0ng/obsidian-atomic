type CacheEntry<T> = {
  mtime: number;
  value: T;
};

type PendingEntry<T> = {
  mtime: number;
  promise: Promise<T>;
};

/**
 * In-memory cache of one parsed view of a note (Time log, set table, cues),
 * keyed by vault path. Entries are reused while the file mtime is unchanged.
 * Concurrent misses for the same path share one load instead of reading twice.
 */
export class NoteParseCache<T> {
  private readonly cache = new Map<string, CacheEntry<T>>();
  private readonly pending = new Map<string, PendingEntry<T>>();

  get(path: string, mtime: number): T | undefined {
    const hit = this.cache.get(path);
    if (!hit || hit.mtime !== mtime) return undefined;
    return hit.value;
  }

  set(path: string, mtime: number, value: T): void {
    this.cache.set(path, { mtime, value });
  }

  /**
   * Cached value for `mtime`, or the result of `load()` (stored under that mtime).
   * A load already in flight for the same path and mtime is reused.
   */
  resolve(path: string, mtime: number, load: () => Promise<T>): Promise<T> {
    const hit = this.get(path, mtime);
    if (hit !== undefined) return Promise.resolve(hit);
    const inFlight = this.pending.get(path);
    if (inFlight && inFlight.mtime === mtime) return inFlight.promise;

    const promise = load().then(
      (value) => {
        if (this.pending.get(path)?.promise === promise) {
          this.pending.delete(path);
          this.set(path, mtime, value);
        }
        return value;
      },
      (error: unknown) => {
        if (this.pending.get(path)?.promise === promise) this.pending.delete(path);
        throw error;
      },
    );
    this.pending.set(path, { mtime, promise });
    return promise;
  }

  invalidate(path?: string): void {
    if (!path) {
      this.cache.clear();
      this.pending.clear();
      return;
    }
    this.cache.delete(path);
    this.pending.delete(path);
  }

  rename(oldPath: string, newPath: string): void {
    const hit = this.cache.get(oldPath);
    this.cache.delete(oldPath);
    this.pending.delete(oldPath);
    if (!hit) {
      this.cache.delete(newPath);
      return;
    }
    this.cache.set(newPath, hit);
  }

  get size(): number {
    return this.cache.size;
  }
}
