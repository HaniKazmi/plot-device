/**
 * How a row of one-size cards is solved against the width it actually has.
 *
 * `minWidth` is the narrowest a card may be; `heightFor` is the height a card of a given width
 * stands at, which the caller derives from whichever of its shapes cannot give — a banner at 16:9
 * across the width, over its band and footer. Whether the figures include a border is the caller's
 * convention: the list shell states them inside its own and adds it.
 */
export interface RowSizing {
  minWidth: number;
  heightFor: (width: number) => number;
}

/**
 * The size every card in a row takes, so that a whole number of them fill the row exactly, and
 * how many that is — which a cap stated in rows multiplies, since only the solved row knows it.
 *
 * As many cards as fit at the minimum, then the row's width shared between them: a row wider than
 * a whole number of minimum-width cards would otherwise end in a strip of empty ground, growing to
 * nearly a card's width before one more fits. The words are what absorb the share — a poster's
 * column widens by it, a banner's picture is a little taller — and `heightFor` is asked of the
 * shared width so every card in the row is still one size.
 *
 * With no width yet — the first render, before the row has been measured — a card is its minimum,
 * which is the size it would have been in a row that fits one exactly.
 */
export const rowCardSize = (
  sizing: RowSizing,
  rowWidth: number | undefined,
  gap: number,
): { width: number; height: number; count: number } => {
  if (rowWidth === undefined || rowWidth < sizing.minWidth) {
    return { width: sizing.minWidth, height: sizing.heightFor(sizing.minWidth), count: 1 };
  }
  // As many as fit at the minimum, then the widest card that number of fill the row exactly.
  const count = Math.max(1, Math.floor((rowWidth + gap) / (sizing.minWidth + gap)));
  const width = Math.floor((rowWidth - (count - 1) * gap) / count);
  return { width, height: sizing.heightFor(width), count };
};
