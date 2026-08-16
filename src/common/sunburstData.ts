import type { Colour } from "../utils/types";

// Hoisted rather than calling localeCompare per comparison — the sort runs across every node
// in the hierarchy.
const collator = new Intl.Collator();

export type SunburstEntry = {
  id: string;
  name: string;
  parent: string;
  value: number;
  color: Colour | undefined;
};

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

  for (const item of data) {
    const count = options.getCount(item);
    if (count === undefined) continue;

    const color = options.getColor(item, groups[0]);

    const addNode = (name: string, parent: string) => {
      const id = `${parent}-${name}`;
      let entry = entryMap.get(id);
      if (!entry) entryMap.set(id, (entry = { id, name, parent, value: 0, color }));
      entry.value += count;
      return id;
    };

    let parent = "";
    for (const group of groups) {
      parent = addNode(options.keyToVal(item, group), parent);
    }
    addNode(options.getLeafName(item), parent);
  }

  return Array.from(entryMap.values()).sort((a, b) => collator.compare(a.id, b.id));
};
