import { rankHits, type Hit, type Searchable } from "../common/searchData";
import { franchiseIndex } from "../common/franchiseIndex";
import { YearMonthDay, type Year } from "../common/date";
import { MEDIA, mediumToLabel, type Medium } from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Season } from "../show/types";
import type { VideoGame } from "../vg/types";
import { omniHours, type OmniItem } from "./adapter";
import { galleryGroups, galleryStripOrder, galleryWorks, workOf, type ShelfItem } from "./galleryData";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/**
 * A franchise as the palette can find it: the raw column value, which is the key every index
 * holds it under, with how much of each medium it holds and the years it spans.
 */
export interface FranchiseSearchEntry extends Searchable {
  kind: "franchise";
  key: string;
  franchise: string;
  counts: Partial<Record<Medium, number>>;
  span: [first: number, last: number];
}

/**
 * A work as the palette can find it — a game, a whole show, a film, a book — with the item that
 * stands for it and a line of facts the hit is told by.
 */
export interface ItemSearchEntry extends Searchable {
  kind: "item";
  key: string;
  medium: Medium;
  /** The union's own item, so a hit opens the card its home tab would; a show's latest season. */
  item: OmniItem;
  facts: string;
  year: number;
}

export type SearchEntry = FranchiseSearchEntry | ItemSearchEntry;

export interface SearchIndex {
  franchises: FranchiseSearchEntry[];
  items: ItemSearchEntry[];
}

/**
 * Whether a franchise group is a series at all: the crossings' rule. Every sheet writes a
 * standalone work's own name into its franchise column, so a group in which every entry repeats
 * the name has no series behind it, and offering it as a franchise would put every standalone work
 * in the library on the list twice.
 */
const isSeries = (franchise: string, items: OmniItem[]) =>
  items.some((item) => !namesTheSameThing(franchise, item.name));

/**
 * The palette's index over the union. Built once per library rather than per keystroke, since the
 * second-rank text is read off four different records and a keystroke should cost a scan of
 * strings already assembled.
 *
 * A franchise's size is its entries — a season each, as the strip's caption counts — and a work's
 * its hours, so among hits of one rank the one the reader spent longest with stands first. A show
 * is one work however many seasons it ran, through the rule the gallery collapses shelves by, and
 * its latest season is the item its hit opens: the show's card is about the show, with that
 * season as the one its strip rings.
 */
export const buildSearchIndex = (items: OmniItem[]): SearchIndex => {
  const franchises = [...franchiseIndex(items, (item) => item.franchise).entries()]
    .filter(([franchise, members]) => isSeries(franchise, members))
    .map(([franchise, members]): FranchiseSearchEntry => {
      const counts: Partial<Record<Medium, number>> = {};
      for (const member of members) counts[member.medium] = (counts[member.medium] ?? 0) + 1;
      const years = members.map((member) => member.year);
      return {
        kind: "franchise",
        key: `franchise:${franchise}`,
        name: franchise,
        franchise,
        secondary: [],
        size: members.length,
        counts,
        span: [Math.min(...years), Math.max(...years)],
      };
    });

  const works = new Map<unknown, OmniItem[]>();
  for (const item of items) works.setIfAbsent(workOf(item), []).push(item);

  const workEntries = [...works.values()].map((members): ItemSearchEntry => {
    const item = representative(members);
    return {
      kind: "item",
      key: `item:${item.key}`,
      medium: item.medium,
      name: item.name,
      secondary: secondaryText(item),
      size: members.sum("hours"),
      item,
      facts: factsOf(item, members),
      year: Math.max(...members.map((member) => member.year)),
    };
  });

  return { franchises, items: workEntries };
};

/** The member that stands for a work: a show's latest season, otherwise its only row's first. */
const representative = (members: OmniItem[]): OmniItem =>
  members[0].medium === "show"
    ? members.toSorted((a, b) => (b.source as Season).s - (a.source as Season).s)[0]
    : members[0];

/**
 * What a hit can be found by besides its name, per medium: the people and places a reader
 * remembers a work by when the title escapes them. Blank cells are dropped, since a blank matches
 * nothing but would still be scanned.
 */
const secondaryText = (item: OmniItem): string[] => {
  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return [game.developer, game.platform];
    }
    case "show": {
      const show = (item.source as Season).show;
      return [show.network, ...show.s.map((season) => season.subtitle ?? "")];
    }
    case "movie":
      return [(item.source as Movie).director];
    case "book": {
      const book = item.source as Book;
      return [book.author, book.series];
    }
  }
};

/**
 * The line a hit is told by: the facts its hover card leads with, in each medium's own words.
 * Hours over every row of the work, so a show's are its seasons' together.
 */
const factsOf = (item: OmniItem, members: OmniItem[]): string => {
  const hours = omniHours(members);
  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return [game.platform, game.status, hours ? `${hours} hours` : ""].filter(Boolean).join(" · ");
    }
    case "show": {
      const show = (item.source as Season).show;
      const seasons = show.s.length === 1 ? "1 season" : `${show.s.length} seasons`;
      return [seasons, show.status, show.network].filter(Boolean).join(" · ");
    }
    case "movie": {
      const movie = item.source as Movie;
      return [movie.cinema ? "Cinema" : "Home", movie.score === undefined ? "" : `${movie.score}/10`, movie.director]
        .filter(Boolean)
        .join(" · ");
    }
    case "book": {
      const book = item.source as Book;
      return [book.author, book.status, book.pages ? `${book.pages} pages` : ""].filter(Boolean).join(" · ");
    }
  }
};

/** One group of the palette's answer: the franchises, or one medium's works. */
export interface SearchGroup {
  key: string;
  label: string;
  medium?: Medium;
  hits: Hit<SearchEntry>[];
  total: number;
}

/** How many hits a group shows before the rest are stated as a count. */
export const HITS_PER_GROUP = 5;

/**
 * The palette's answer to a query: franchises first, then each medium's works in the tabs' own
 * order, a group with nothing to say left out. Franchises lead because they are the one kind of
 * hit that answers with more than itself.
 */
export const searchUnion = (index: SearchIndex, query: string, limit = HITS_PER_GROUP): SearchGroup[] => {
  const groups: SearchGroup[] = [
    { key: "franchise", label: "Franchises", ...rankHits(index.franchises, query, limit) },
    ...MEDIA.map((medium) => ({
      key: medium,
      label: mediumToLabel(medium),
      medium,
      ...rankHits(
        index.items.filter((entry) => entry.medium === medium),
        query,
        limit,
      ),
    })),
  ];
  return groups.filter((group) => group.total > 0);
};

/**
 * The works a franchise holds, newest first, one card per work: the gallery's own collapse over
 * the franchise's rows alone, so a franchise view and a franchise shelf's drill-down cannot list
 * one franchise two ways. Over the rows themselves rather than the shelves, which drop a
 * franchise of one work; a view opened on one has that one to show.
 */
export const franchiseWorks = (items: OmniItem[], franchise: string, today: YearMonthDay): ShelfItem[] =>
  galleryStripOrder(
    galleryWorks(
      items.filter((item) => item.franchise === franchise),
      "franchise",
      today,
    ),
    "recent",
  );

/**
 * What a franchise view states above its works: when it began, when it was last touched, how long
 * it has taken, and how many media it reaches. The last date is `undefined` while any row of it is
 * still open, which the view states as now.
 */
export const franchiseFacts = (items: OmniItem[]) => {
  const open = items.some((item) => !item.closeDate);
  const closes = items.map((item) => item.closeDate).filter((date) => date !== undefined);
  // Compared at the end of the range each value denotes, as the gallery's own recency is: a bare
  // year runs to its 31 December, where its string sorts before any day inside it.
  const last = closes.reduce<YearMonthDay | Year | undefined>(
    (latest, date) => (latest === undefined || date.lastDay() > latest.lastDay() ? date : latest),
    undefined,
  );
  return {
    firstYear: Math.min(...items.map((item) => item.year)),
    last: open ? undefined : last,
    hours: omniHours(items),
    media: new Set(items.map((item) => item.medium)).size,
  };
};

/**
 * The franchises met most recently, for the palette before anything is typed: the gallery's own
 * recent order over its franchise shelves, which already drops a group of one work.
 */
export const recentFranchises = (items: OmniItem[], today: YearMonthDay, limit: number): string[] =>
  galleryGroups(items, "franchise", "Items", "recent", today)
    .slice(0, limit)
    .map((shelf) => shelf.name);

/**
 * Where a franchise's context bar opens: the first of January of the earliest year anything in
 * the union was attributed to, so every franchise view brackets its window on one scale and two
 * views are comparable. An attribution year is an end year, so a franchise begun earlier opens its
 * own window before this; the strip widens the bar's scale to the window in that case rather than
 * clamping the entry, and only the bar's left label differs between such a view and the rest.
 */
export const unionEpoch = (items: OmniItem[], today: YearMonthDay): YearMonthDay =>
  YearMonthDay.get(items.length ? Math.min(...items.map((item) => item.year)) : today.year, 1, 1);
