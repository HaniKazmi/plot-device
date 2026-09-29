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
   */
  const chips = (has: Partial<Record<K, boolean>> = {}) =>
    keys.filter((key) => has[key] !== false).map((key) => ({ id: ids[key], label: labels.get(key)! }));

  return { ids, chips };
};

/**
 * The sections every tracked tab's page runs in, in the order it runs them: what is being played,
 * watched or read now, then what the library is made of, then what can be explored, then the deep
 * dives, the wall closing the page at every width.
 *
 * One list rather than four, because the four tabs are one page architecture and a section added
 * to it — or "Explore" reworded — is otherwise a four-file edit that nothing fails over when one
 * of them drifts. The one thing a tab varies is what its first anchor is called: Movies names its
 * `latest`, a film being watched rather than in progress, and the chip reads "Now" regardless.
 */
export type TrackedSectionKey = "vitals" | "top" | "explore" | "timeline" | "charts" | "library";

export const trackedTabSections = <P extends string, N extends string = "now">(prefix: P, nowKey: N = "now" as N) =>
  tabSections<P, N | TrackedSectionKey>(prefix, [
    { key: nowKey, label: "Now" },
    { key: "vitals", label: "Vitals" },
    { key: "top", label: "Top" },
    { key: "explore", label: "Explore" },
    { key: "timeline", label: "Timeline" },
    { key: "charts", label: "Charts" },
    { key: "library", label: "Library" },
  ]);
