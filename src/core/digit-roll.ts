/** Pure digit-reel plan. No DOM. The view maps this onto clipped reels. */

export type RollDigit = {
  kind: "digit";
  value: number;
  /** Rightmost digit is 0 so stagger starts there. */
  indexFromRight: number;
};

export type RollGlyph = {
  kind: "glyph";
  value: string;
};

export type RollChar = RollDigit | RollGlyph;

export function rollChars(text: string): RollChar[] {
  const chars = [...String(text)];
  const last = chars.length - 1;
  return chars.map((char, index) => {
    if (/^\d$/.test(char)) {
      return {
        kind: "digit",
        value: Number(char),
        indexFromRight: last - index,
      };
    }
    return { kind: "glyph", value: char };
  });
}
