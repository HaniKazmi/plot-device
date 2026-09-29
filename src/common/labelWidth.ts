/**
 * How wide a label's own box reports itself, without laying one out: the packed chart's bar names,
 * and a stacked row's where one fits on its band.
 *
 * The label is `white-space: nowrap` inside an `overflow: hidden` box, so the width it reports is
 * its glyphs plus the padding either side, rounded to the whole pixel — which a canvas answers
 * exactly, given the same font. The two agree: over 1,878 placement decisions, across both charts
 * at two widths, none comes out differently.
 *
 * Asking the DOM instead costs two renders of the whole chart. The measurement can only be taken
 * after a commit, so every label is drawn once at a default placement and again at the measured
 * one — 1,798 style writes across 792 labels on the Shows timeline. It also has to be taken while
 * every label still wears that default, since a placed label reports the width its own answer
 * pinned it to rather than its text, which makes the two-pass shape load-bearing rather than
 * incidental. And the read is `scrollWidth` on HTML inside a `foreignObject`, WebKit's weakest
 * layout path, three hundred to eight hundred times over.
 *
 * Cached across charts and re-renders: a name is a fixed string, and the same library is drawn
 * again on every filter change.
 */
const labelWidths = new Map<string, number>();
let measureContext: CanvasRenderingContext2D | null | undefined;

export const measureLabel = (text: string, font: string, fontSize: number, padding: number) => {
  const key = `${font}\u0000${padding}\u0000${text}`;
  const held = labelWidths.get(key);
  if (held !== undefined) return held;

  // Built on first use rather than at module scope, where `document` is absent under the test
  // environment and importing this file would throw.
  measureContext =
    measureContext === undefined ? (document.createElement("canvas").getContext("2d") ?? null) : measureContext;
  // Set per measurement rather than once: the context is shared, and the font is part of the cache
  // key, so a caller measuring in another face has to be able to say so.
  if (measureContext) measureContext.font = font;

  // Half the font size a character is a coarse average for a proportional face, and coarse is the
  // point: `decidePlacement` opens on `textWidth <= rectWidth`, so answering zero for a canvas that
  // would not build reads as "fits inside any bar" and pins every label inside a sliver under
  // `overflow: hidden` — a chart with no readable text and nothing said about why.
  const width = measureContext
    ? Math.round(measureContext.measureText(text).width + 2 * padding)
    : Math.round(text.length * (fontSize / 2) + 2 * padding);
  labelWidths.set(key, width);
  return width;
};
