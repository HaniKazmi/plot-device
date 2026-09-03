import type { Colour } from "../utils/types";

// Hoisted rather than calling localeCompare per comparison — the sort runs across every node
// in the hierarchy.
const collator = new Intl.Collator();

type SunburstEntry = {
  id: string;
  name: string;
  parent: string;
  value: number;
  color: Colour | undefined;
};

/**
 * Where the hierarchy is drawn from: the drilled id while the data still holds a node with it, and
 * the top ("") otherwise. Re-nesting the groups rebuilds every id below the first ring, and a
 * filter can empty the drilled subtree, so a drilled id routinely names no node in the next data —
 * and `SunburstSeries.translate` reads that node's `parent` without checking it is there, which
 * throws rather than falling back to the top the way the treemap it descends from does.
 *
 * `atTop` is the same question the leaf ring is collapsed by, answered off the data rather than
 * held beside the id: a node on the first ring is one whose parent is the top, and a root that has
 * been reset is the top itself.
 */
export const sunburstRoot = (data: SunburstEntry[], id: string): { id: string; atTop: boolean } => {
  const node = data.find((entry) => entry.id === id);
  return node ? { id, atTop: node.parent === "" } : { id: "", atTop: true };
};

/**
 * What each ring's select may offer, given what the other rings already hold.
 *
 * A key held twice nests a hierarchy inside itself: the second ring divides every wedge into one
 * child of the same name, a ring of arcs identical to the ring inside it. Removing a taken key
 * from the other menus is what makes that unreachable, rather than drawing it and leaving the
 * reader to recognise the picture as a mistake.
 *
 * A menu left holding only the value it already shows is a control that cannot be changed, so a
 * ring with nothing else to offer keeps the whole list instead — which is the case for a domain
 * offering exactly as many keys as it has rings, where every key is taken by definition. Choosing
 * a duplicate is then possible again, and drawn as the duplicate it is.
 */
export const ringOptions = <K extends string>(options: readonly K[], chosen: readonly K[]): K[][] =>
  chosen.map((current, ring) => {
    // Every other ring's key, taken by position rather than by value, so a ring keeps the key it
    // is showing even where a second ring is showing the same one.
    const taken = new Set(chosen.filter((_, index) => index !== ring));
    const available = options.filter((option) => option === current || !taken.has(option));
    return available.length > 1 ? available : [...options];
  });

export const generateSunburstData = <T, K extends string>(
  data: T[],
  groups: K[],
  options: {
    keyToVal: (item: T, key: K) => string;
    getCount: (item: T) => number | undefined;
    getColor: (item: T, firstGroup: K) => Colour | undefined;
    getLeafName: (item: T) => string;
  },
): SunburstEntry[] => {
  const entryMap = new Map<string, SunburstEntry>();

  // Hoisted out of the loop: taking `count` and `color` as arguments avoids rebuilding the
  // closure once per row.
  const addNode = (name: string, parent: string, count: number, color: Colour | undefined) => {
    const id = `${parent}-${name}`;
    let entry = entryMap.get(id);
    if (!entry) entryMap.set(id, (entry = { id, name, parent, value: 0, color }));
    entry.value += count;
    return id;
  };

  for (const item of data) {
    const count = options.getCount(item);
    if (count === undefined) continue;

    const color = options.getColor(item, groups[0]);

    let parent = "";
    for (const group of groups) {
      parent = addNode(options.keyToVal(item, group), parent, count, color);
    }
    addNode(options.getLeafName(item), parent, count, color);
  }

  return Array.from(entryMap.values()).sort((a, b) => collator.compare(a.id, b.id));
};
