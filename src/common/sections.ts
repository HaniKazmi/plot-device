/**
 * A tab's section anchors and the rail's chips for them, built from one ordered list.
 *
 * The anchors have two holders — `Stats` carries the bands above the charts and `Graphs`
 * everything below — so they live apart from both, and an id written out twice is an id that can
 * be changed once. The chips have the same problem against the anchors themselves: a rail offering
 * a chip whose anchor is not on the page scrolls nowhere and looks broken, and the two lists are
 * kept in step by hand only until someone adds a section to one of them.
 *
 * Deriving both from the same array is what removes that. The order of the array is the order of
 * the page, and the rail runs in it.
 */
export const tabSections = <P extends string, K extends string>(
  prefix: P,
  sections: readonly { key: K; label: string }[],
) => {
  // Entries typed as tuples, not as `string[]`. `Object.fromEntries` has an overload returning
  // `any` for the looser shape, and an assertion onto that checks nothing at all — which is what
  // silently reduced every id from the literal its `as const` map carried to a bare `string`.
  const ids = Object.fromEntries(sections.map(({ key }) => [key, `${prefix}-${key}`] as const)) as {
    [Key in K]: `${P}-${Key}`;
  };

  const keys = sections.map(({ key }) => key);
  const labels = new Map(sections.map(({ key, label }) => [key, label]));

  /**
   * The chips for the sections actually rendered.
   *
   * A section is offered unless it is named `false`, so a page states only the sections it
   * conditions and the always-present ones need no entry — the vitals band always stands, because
   * a total of zero is a true answer to how much.
   *
   * `order` is for a page that runs its sections in a different order at some width — the phone,
   * where the charts follow the library. The rail must be told, and told the same thing the page
   * renders: `useActiveSection` finds the current section as the first of *its* list still in the
   * band, so a rail whose order is not the DOM's lights the wrong chip from the first scroll.
   */
  const chips = (has: Partial<Record<K, boolean>> = {}, order: readonly K[] = keys) =>
    order.filter((key) => has[key] !== false).map((key) => ({ id: ids[key], label: labels.get(key)! }));

  return { ids, keys, chips };
};

/**
 * The same keys with one lifted to sit directly after another.
 *
 * One fact stated once for the four tabs that state it: on a phone a page's charts come after its
 * library. A key naming nothing in the list, or asked to follow itself, leaves the order as it is,
 * so a page whose section is conditional cannot be reordered into a list it is not in.
 */
export const movedAfter = <K extends string>(keys: readonly K[], key: K, after: K): K[] => {
  if (key === after || !keys.includes(key) || !keys.includes(after)) return [...keys];

  const rest = keys.filter((each) => each !== key);
  const at = rest.indexOf(after);
  return [...rest.slice(0, at + 1), key, ...rest.slice(at + 1)];
};
