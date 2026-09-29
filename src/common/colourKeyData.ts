import "../utils/mapUtils";

/**
 * How a key's values are ordered: the order a reader looks a colour up in, which for a list of
 * words is alphabetical. Numeric-aware, so a vocabulary of ages or decades reads in the order its
 * figures climb rather than "12, 15, 18, 3, 7". Hoisted, since a key is re-derived on every filter
 * change.
 */
const keyCollator = new Intl.Collator(undefined, { numeric: true });

/**
 * A vocabulary as it stands over these items: one entry per value present, in the order a reader
 * reads them.
 *
 * Both halves come off the same item, so the swatch and the word cannot disagree about which value
 * wears which colour. A value whose colour lookup answers nothing is left out — `statusToColour`
 * and `companyToColor` answer `undefined` off their tables, a franchise off the shared table `""`
 * — and the mark wears no colour of its own for it either.
 */
export const colourKeyEntries = <U>(
  data: readonly U[],
  valueOf: (item: U) => string,
  colour: ((item: U) => string | undefined) | undefined,
): { value: string; colour: string }[] => {
  if (!colour) return [];
  const found = new Map<string, string>();
  data.forEach((item) => {
    const fill = colour(item);
    if (fill) found.setIfAbsent(valueOf(item), fill);
  });
  return [...found]
    .map(([value, fill]) => ({ value, colour: fill }))
    .toSorted((a, b) => keyCollator.compare(a.value, b.value));
};
