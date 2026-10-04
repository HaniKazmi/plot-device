import { formatDate, type YearMonthDay } from "../common/date";
import { byDate } from "../common/finishedData";
import type { CreditRole, OmniItem } from "../common/medium";
import type { TopGroup } from "../common/statsData";
import { galleryStripOrder, galleryValue, galleryWorks, isSeries, worksIn, type ShelfItem } from "../app/galleryData";
import { measureOf } from "../app/library";
import { moduleOf } from "../app/media";
import type { Measure } from "../app/types";
import { mediumToLabel, MEDIA, type Medium } from "../utils/types";
import { lineOf } from "./timelineData";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** Every row of the union one franchise column names. */
export const franchiseItems = (items: OmniItem[], franchise: string): OmniItem[] =>
  items.filter((item) => item.franchise === franchise);

/** The day an item was first met, the span its own module answers, as the crossings and the strips read it. */
const startOf = (item: OmniItem, today: YearMonthDay): YearMonthDay => moduleOf(item).span(item.source, today).start;

/** Oldest first by when each was begun, every start read once rather than once per comparison. */
const byStart = <T extends OmniItem>(items: readonly T[], today: YearMonthDay): T[] => {
  const starts = new Map(items.map((item) => [item, startOf(item, today)]));
  return items.toSorted((a, b) => byDate(starts.get(a), starts.get(b)));
};

/**
 * The one value every item answers, or `undefined` where they differ. What decides whether a field
 * gets a ranked card on the page or a line in the dossier, asked once so the two cannot disagree.
 */
export const sharedValue = <T>(items: readonly OmniItem[], valueOf: (item: OmniItem) => T | undefined) => {
  const values = new Set(
    items.flatMap((item) => {
      const value = valueOf(item);
      return value === undefined ? [] : [value];
    }),
  );
  return values.size === 1 ? [...values][0] : undefined;
};

/**
 * Where a franchise stands among the library's franchises by hours, counting only the groups that
 * are series at all (`isSeries`) — the same population the Omnibus's own franchise figure counts,
 * so a work naming itself is never ranked against Pokémon.
 */
export const franchiseRank = (items: OmniItem[], franchise: string): { rank: number; of: number } => {
  const byFranchise = new Map<string, OmniItem[]>();
  for (const item of items) byFranchise.setIfAbsent(item.franchise, []).push(item);
  const ranked = [...byFranchise.entries()]
    .filter(([name, members]) => name === franchise || isSeries(name, members))
    .map(([name, members]) => ({ name, hours: members.sum("hours") }))
    .toSorted((a, b) => b.hours - a.hours);
  return { rank: ranked.findIndex((entry) => entry.name === franchise) + 1, of: ranked.length };
};

/** How many calendar years a franchise spans, first meeting to last, both ends counted. */
export const franchiseYears = (items: OmniItem[], today: YearMonthDay): number => {
  const starts = items.map((item) => startOf(item, today).year);
  const ends = items.map((item) => (item.closeDate ?? today).year);
  return Math.max(...ends) - Math.min(...starts) + 1;
};

/** One line of the dossier. */
export interface DossierRow {
  label: string;
  value: string;
}

/**
 * The facts about a franchise no section below states: where it began and where it stands, its
 * biggest series, its best-rated entry and its longest game — and, for a field the whole franchise
 * shares, that one word, where a ranked card would be a single full bar.
 */
export const dossierRows = (items: OmniItem[], lines: FranchiseShelf[], today: YearMonthDay): DossierRow[] => {
  const [first] = byStart(items, today);
  const open = items.filter((item) => !item.closeDate);
  const closed = items.filter((item) => item.closeDate);
  const latest = closed.length
    ? closed.reduce((best, item) => (byDate(item.closeDate, best.closeDate) > 0 ? item : best))
    : undefined;
  const rows: DossierRow[] = [{ label: "First", value: `${first.name}, ${formatDate(startOf(first, today))}` }];
  if (open.length) rows.push({ label: "In progress", value: [...new Set(open.map((item) => item.name))].join(", ") });
  if (latest) rows.push({ label: "Latest", value: `${latest.name}, ${formatDate(latest.closeDate!)}` });

  const biggest = lines.toSorted((a, b) => b.items.length - a.items.length)[0];
  if (biggest) rows.push({ label: "Biggest series", value: `${biggest.name}, ${biggest.items.length}` });

  const scored = items.filter((item) => item.score !== undefined);
  if (scored.length) {
    const best = scored.reduce((top, item) => (item.score! >= top.score! ? item : top));
    rows.push({ label: "Best rated", value: `${best.name}, ${best.score}/10` });
  }
  const games = items.filter((item) => item.medium === "game");
  if (games.length > 1) {
    const longest = games.reduce((top, item) => (item.hours > top.hours ? item : top));
    rows.push({ label: "Longest game", value: `${longest.name}, ${Math.floor(longest.hours)} hours` });
  }

  const medium = sharedValue(items, (item) => item.medium);
  if (medium) rows.push({ label: "Media", value: `${mediumToLabel(medium)} only` });
  const style = sharedValue(items, (item) => item.style);
  if (style) rows.push({ label: "Style", value: `All ${style}` });
  const venue = sharedValue(items, (item) => item.venue);
  if (venue) rows.push({ label: "Where", value: `All ${venue}` });
  return rows;
};

/** What a ranked card on this page can be pointed at. */
export const FRANCHISE_TOPS = ["genre", "where", "style", "decade"] as const;
export type FranchiseTop = (typeof FRANCHISE_TOPS)[number];

/**
 * The values an item carries under a ranked card. A genre counts every genre an item carries, not
 * only its first: a franchise's first genre is nearly always one word — every Star Wars entry is
 * Sci-Fi — and the variety is in the rest.
 */
const topValues = (item: OmniItem, top: FranchiseTop): string[] => {
  switch (top) {
    case "genre":
      return [item.genre, ...item.otherGenres];
    case "where":
      return [item.venue];
    case "style":
      return item.style ? [item.style] : [];
    case "decade":
      return [galleryValue(item, "decade")];
  }
};

/**
 * A ranked card's groups, measured in the page's own measure and largest first. Each group's `top`
 * is its own name, which is all the card needs to colour it.
 */
export const franchiseTop = (items: OmniItem[], top: FranchiseTop, measure: Measure): TopGroup<string>[] => {
  const groups = new Map<string, OmniItem[]>();
  for (const item of items)
    for (const value of topValues(item, top)) if (value) groups.setIfAbsent(value, []).push(item);
  return [...groups.entries()]
    .map(([name, members]) => ({ name, count: measureOf(members, measure), top: name }))
    .filter((group) => group.count > 0)
    .toSorted((a, b) => b.count - a.count);
};

/** One shelf of the franchise's library: a series, a medium or a year. */
export interface FranchiseShelf {
  key: string;
  name: string;
  /** The medium a shelf belongs to, where it belongs to one — every series does, a year does not. */
  medium?: Medium;
  items: ShelfItem[];
}

/** How the library is shelved. */
export const SHELVINGS = ["series", "medium", "year"] as const;
export type Shelving = (typeof SHELVINGS)[number];

/**
 * The franchise's works, one card each, with a show's seasons kept apart: a show is a line of
 * seasons the way a film series is a line of films, and collapsed to one card it would have no
 * shelf of its own to stand on.
 */
const libraryWorks = (items: OmniItem[], today: YearMonthDay): ShelfItem[] => [
  ...galleryWorks(
    items.filter((item) => item.medium !== "show"),
    "franchise",
    today,
  ),
  ...items.filter((item) => item.medium === "show").map((item) => ({ ...item, metDate: item.closeDate ?? today })),
];

/**
 * Every series of two or more works among a set, in the order the reader met them, each in its own
 * order — its numbers first, its unnumbered entries by when they were met. A series stays inside
 * its own medium (`lineOf`), so the Witcher games and the Witcher books are two lines however both
 * are named.
 */
const linesOf = (works: ShelfItem[], today: YearMonthDay): FranchiseShelf[] => {
  const lines = new Map<string, ShelfItem[]>();
  for (const work of byStart(works, today)) {
    const line = lineOf(work);
    if (line) lines.setIfAbsent(line, []).push(work);
  }
  // The works were read oldest first, so each line's first work is the one it was met at, and a
  // stable sort on the number leaves an unnumbered work where it was met.
  return [...lines.entries()]
    .filter(([, members]) => members.length > 1)
    .map(([key, members]) => ({
      key,
      name: members[0].series,
      medium: members[0].medium,
      items: members.toSorted((a, b) => (a.seriesNumber ?? Infinity) - (b.seriesNumber ?? Infinity)),
    }));
};

/** Every series of two or more works in a franchise, in the order the reader met them. */
export const franchiseLines = (items: OmniItem[], today: YearMonthDay): FranchiseShelf[] =>
  linesOf(libraryWorks(items, today), today);

/** The franchise's library cut into shelves, each shelf's works in the order they were met. */
export const franchiseShelves = (items: OmniItem[], shelving: Shelving, today: YearMonthDay): FranchiseShelf[] => {
  const works = byStart(libraryWorks(items, today), today);
  switch (shelving) {
    case "series": {
      const lines = linesOf(works, today);
      const lined = new Set(lines.flatMap((line) => line.items.map((item) => item.key)));
      const rest = works.filter((work) => !lined.has(work.key));
      return rest.length ? [...lines, { key: "standalone", name: "Standalone", items: rest }] : lines;
    }
    case "medium":
      return MEDIA.map((medium) => ({
        key: medium,
        name: mediumToLabel(medium),
        medium,
        items: works.filter((work) => work.medium === medium),
      })).filter((shelf) => shelf.items.length > 0);
    case "year": {
      const years = new Map<number, ShelfItem[]>();
      for (const work of works) years.setIfAbsent(startOf(work, today).year, []).push(work);
      return [...years.entries()]
        .toSorted(([a], [b]) => b - a)
        .map(([year, members]) => ({ key: String(year), name: String(year), items: members }));
    }
  }
};

/** A shelf's works newest first, the gallery's own recent order, for the library's order picker. */
export const newestFirst = (items: ShelfItem[]) => galleryStripOrder(items, "recent");

/** The words a credit column is headed with, by the role it lists. */
export const CREDIT_ROLES: readonly { role: CreditRole; verb: string; medium: Medium; noun: [string, string] }[] = [
  { role: "author", verb: "Written", medium: "book", noun: ["author", "authors"] },
  { role: "director", verb: "Directed", medium: "movie", noun: ["director", "directors"] },
  { role: "developer", verb: "Developed", medium: "game", noun: ["studio", "studios"] },
  { role: "publisher", verb: "Published", medium: "game", noun: ["publisher", "publishers"] },
  { role: "network", verb: "Aired on", medium: "show", noun: ["network", "networks"] },
];

/** One person or studio in a credit column. */
export interface Maker {
  name: string;
  /** This franchise's rows they made. */
  items: OmniItem[];
  works: number;
  hours: number;
  /** What else in the library carries the same credit, by franchise, biggest first. */
  elsewhere: { franchise: string; works: number }[];
  /** Every row of the library carrying the credit, this franchise's included, for the layer. */
  everything: OmniItem[];
}

const creditKey = (role: CreditRole, name: string) => `${role}\u0000${name}`;

/** Every row of the library by each credit it carries, built in one pass so a column looks a name up. */
export const creditIndex = (library: readonly OmniItem[]): Map<string, OmniItem[]> => {
  const index = new Map<string, OmniItem[]>();
  for (const item of library)
    for (const credit of item.credits) index.setIfAbsent(creditKey(credit.role, credit.name), []).push(item);
  return index;
};

/** Everyone credited in one role across a franchise, the most prolific first. */
export const creditColumn = (items: OmniItem[], index: Map<string, OmniItem[]>, role: CreditRole): Maker[] => {
  const byName = new Map<string, OmniItem[]>();
  for (const item of items)
    for (const credit of item.credits) if (credit.role === role) byName.setIfAbsent(credit.name, []).push(item);

  return [...byName.entries()]
    .map(([name, own]) => {
      const everything = index.get(creditKey(role, name)) ?? own;
      const others = new Map<string, OmniItem[]>();
      for (const item of everything)
        if (item.franchise !== own[0].franchise) others.setIfAbsent(item.franchise, []).push(item);
      return {
        name,
        items: own,
        works: worksIn(own),
        hours: own.sum("hours"),
        elsewhere: [...others.entries()]
          .map(([franchise, rows]) => ({ franchise, works: worksIn(rows) }))
          .toSorted((a, b) => b.works - a.works),
        everything,
      };
    })
    .toSorted((a, b) => b.works - a.works || b.hours - a.hours || a.name.localeCompare(b.name));
};

/**
 * Whether every game in a franchise was published by the studio that made it, in which case a
 * publisher reading of the games says nothing the developer reading has not.
 */
export const selfPublished = (items: OmniItem[]): boolean =>
  items
    .filter((item) => item.medium === "game")
    .every((item) => {
      const named = (role: CreditRole) => item.credits.find((credit) => credit.role === role)?.name;
      return named("developer") === named("publisher");
    });
