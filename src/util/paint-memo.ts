/** DOM surface a paint memo needs; pure tests pass a stub. */
export type PaintHost = object & { querySelector(selector: string): unknown };

/**
 * Remembers what each host element was last painted from so a refresh whose
 * inputs did not change can leave the DOM alone. Views call
 * {@link PaintMemo.shouldSkip} before `el.empty()`.
 */
export class PaintMemo<S> {
  private readonly states = new WeakMap<object, S>();
  /** Matches something only a completed paint leaves in the host. */
  private readonly paintedSelector: string;
  private readonly same: (previous: S | undefined, next: S) => boolean;

  // Explicit fields on purpose: Node's --experimental-strip-types (the unit
  // test runner) rejects TypeScript parameter properties.
  constructor(
    paintedSelector: string,
    same: (previous: S | undefined, next: S) => boolean,
  ) {
    this.paintedSelector = paintedSelector;
    this.same = same;
  }

  isPainted(el: PaintHost): boolean {
    return !!el.querySelector(this.paintedSelector);
  }

  /**
   * True when `el` still shows a paint built from a state equivalent to
   * `next`. Otherwise records `next` as the state about to be painted.
   */
  shouldSkip(el: PaintHost, next: S): boolean {
    if (this.isPainted(el) && this.same(this.states.get(el), next)) return true;
    this.states.set(el, next);
    return false;
  }
}

/** Element-wise list equality; `null` lists only equal themselves. */
export function sameList<T>(
  left: readonly T[] | null,
  right: readonly T[] | null,
  same: (a: T, b: T) => boolean = (a, b) => a === b,
): boolean {
  if (left === right) return true;
  if (left == null || right == null) return false;
  return left.length === right.length && left.every((item, i) => same(item, right[i]));
}
