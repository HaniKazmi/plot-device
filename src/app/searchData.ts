import { rankHits, type Hit, type Searchable } from "../common/searchData";
import { franchiseIndex } from "../common/franchiseIndex";
import { YearMonthDay, type Year } from "../common/date";
import { certificateBand, isCertificate, mediumToLabel, type Medium } from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import { eachMedium, MEDIA, moduleOf } from "./media";
import type { Season } from "../show/types";
import { countByMedium, type OmniItem } from "../common/medium";
import type { PageAction } from "../common/filterReducer";
import { omniHours, type Library } from "./library";
import { galleryGroups, galleryStripOrder, galleryWorks, workOf, type ShelfItem } from "./galleryData";
import { media } from "./types";
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

/**
 * One value of one filter category, as the box can find it: a genre, a network, a platform, an
 * author, a director, a format, a certificate tier.
 *
 * The vocabulary is each tab's own schema, so the box cannot offer a narrowing that tab's own
 * control surface does not draw. Franchise is deliberately not among them: a franchise is a
 * *thing* the box already answers with, opening the view over the whole series, and indexing it
 * here as well would put every series on one query twice.
 *
 * `values` is what the hit stands for on a tab, which is the value itself everywhere but certificate:
 * the two boards write one tier as `15` and as `16`, so a hit on the tier has to set whichever of
 * them that tab's own rows carry.
 */
export interface AttributeEntry extends Searchable {
  kind: "attribute";
  key: string;
  /** The schema field a hit sets, the same string that tab's own category is keyed on. */
  category: string;
  /** What the category is called, for the line of facts under the hit's name. */
  label: string;
  /** The value as the hit states it: a certificate band, or the cell as written. */
  value: string;
  counts: Partial<Record<Medium, number>>;
  values: Partial<Record<Medium, string[]>>;
}

/**
 * An attribute on one particular tab, which is what a hit actually is: the same genre reads as
 * "filter this page" where the reader is and as "Shows · Comedy" where they are not.
 *
 * A clone per tab rather than a tab carried beside the hit, so the box's flat list, its keys and
 * its keyboard stay one shape. The clone is made after ranking, whose fold cache is keyed on the
 * entries the ranker was handed.
 */
export interface PlacedAttribute extends AttributeEntry {
  /** The tab the hit acts on. */
  tab: string;
  /** Its medium, absent for the tab that is no medium — whose values are the union's own. */
  medium?: Medium;
  /** Whether that tab is the one being read, which is what ↵ does something different for. */
  here: boolean;
}

export type SearchEntry = FranchiseSearchEntry | ItemSearchEntry | PlacedAttribute;

export interface SearchIndex {
  franchises: FranchiseSearchEntry[];
  items: ItemSearchEntry[];
  attributes: AttributeEntry[];
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
export const buildSearchIndex = (items: OmniItem[], library: Library): SearchIndex => {
  const franchises = [...franchiseIndex(items, (item) => item.franchise).entries()]
    .filter(([franchise, members]) => isSeries(franchise, members))
    .map(([franchise, members]): FranchiseSearchEntry => {
      const years = members.map((member) => member.year);
      return {
        kind: "franchise",
        key: `franchise:${franchise}`,
        name: franchise,
        franchise,
        secondary: [],
        size: members.length,
        counts: countByMedium(members),
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

  return { franchises, items: workEntries, attributes: buildAttributeIndex(library) };
};

/**
 * The category whose values the box does not index, and why.
 *
 * A franchise is a *thing* the box already answers with — a hit on one opens the view over the
 * whole series across the four media — so indexing it as a narrowing too would put every series on
 * a query twice, once to look at and once to filter by.
 */
const NOT_AN_ATTRIBUTE = "franchise";

/**
 * The value a category's cell is found under.
 *
 * The certificate is the one category whose values differ by tab: BBFC issues a 15 where PEGI
 * issues a 16, for one tier under two numbers. Grouped on the band, one hit filters each tab to
 * whichever number that tab's own rows carry — the rule the gallery's certificate shelves already
 * group by.
 */
const attributeValue = (category: string, cell: string): string =>
  category === "certificate" && isCertificate(cell) ? certificateBand(cell) : cell;

/**
 * What every tab can be narrowed by, with a count per medium: one entry per category value, over
 * each medium's own schema and its own rows.
 *
 * Built beside the work index and with it, since both are a pass over the libraries and a
 * keystroke should cost a scan of strings already assembled. A blank cell is skipped — a category
 * a medium answers `""` to is a hit nobody could name — and so is every category a tab's own
 * control surface would not draw, since the box offers exactly the narrowings the page holds.
 */
export const buildAttributeIndex = (library: Library): AttributeEntry[] => {
  const found = new Map<string, AttributeEntry>();

  eachMedium((medium, module) => {
    for (const category of module.filters.categories) {
      if (category.key === NOT_AN_ATTRIBUTE) continue;
      for (const item of library[medium]) {
        const cell = category.valueOf(item);
        if (!cell) continue;
        const value = attributeValue(category.key, cell);
        const key = `attribute:${category.key}:${value}`;
        const entry = found.setIfAbsent(key, {
          kind: "attribute" as const,
          key,
          category: category.key,
          label: category.label,
          value,
          name: value,
          secondary: [],
          size: 0,
          counts: {},
          values: {},
        });
        entry.size += 1;
        entry.counts[medium] = (entry.counts[medium] ?? 0) + 1;
        const held: string[] = entry.values[medium] ?? [];
        if (!held.includes(cell)) held.push(cell);
        entry.values[medium] = held;
      }
    }
  });

  return [...found.values()];
};

/**
 * Every tab an attribute hit can be taken to, the one being read first.
 *
 * The current tab leads because ↵ does the nearest thing: on a tab holding the category the hit
 * narrows the page the reader is already looking at, and on one that does not it is a place — "the
 * Shows tab, filtered to Netflix" — which is a jump and not a narrowing. Whether the current tab
 * holds it is asked of that tab's own schema by the caller, since the composing tab is a page with
 * filters and no medium, and its categories are not in the per-medium index.
 */
export const attributePlacements = (
  entry: AttributeEntry,
  currentTabId: string,
  currentCategories: readonly string[],
): PlacedAttribute[] => {
  const currentMedium = media.find((medium) => MEDIA[medium].tabId === currentTabId);
  // The media holding the value, which is exactly the media the index counted rows for: `counts`
  // gains a key on the first row found and the walk is in the order the app says the media.
  const tabs = Object.keys(entry.counts) as Medium[];
  // Held rather than only offered: a page whose schema has the category but whose rows hold none
  // of this value would narrow to nothing, which is a hit that empties the page it was pressed on.
  // The composing tab holds whatever any medium does.
  const holdsIt = currentMedium ? tabs.includes(currentMedium) : tabs.length > 0;
  const here: PlacedAttribute[] =
    currentCategories.includes(entry.category) && holdsIt
      ? [{ ...entry, key: `${entry.key}:${currentTabId}`, tab: currentTabId, medium: currentMedium, here: true }]
      : [];

  const elsewhere = tabs
    .filter((medium) => MEDIA[medium].tabId !== currentTabId)
    .map((medium): PlacedAttribute => ({
      ...entry,
      key: `${entry.key}:${MEDIA[medium].tabId}`,
      tab: MEDIA[medium].tabId,
      medium,
      here: false,
    }));

  return [...here, ...elsewhere];
};

/**
 * What a hit sets on its own tab: the values it stands for there, added to whatever that tab
 * already holds.
 *
 * Added rather than replacing, because a reader narrowing to two genres in a row means both — the
 * same thing a second chip pressed in This page means. A tab that is no medium has no notation of
 * its own to expand into and takes the value as stated.
 */
export const attributeAction = (entry: PlacedAttribute, held: readonly string[]): PageAction => {
  const values = (entry.medium && entry.values[entry.medium]) ?? [entry.value];
  return {
    type: "updateFilter",
    filter: entry.category,
    value: [...held, ...values.filter((value) => !held.includes(value))],
  };
};

/**
 * The rows an attribute holds, across the four libraries, in the union's own unit.
 *
 * Filtered on each medium's own records and then flattened, rather than over the union: a filter
 * category reads the record the *tab* holds, which for Shows is a show and not the season the
 * union counts in — a season carries no genre of its own. Narrowing first and flattening after is
 * also what makes the shelf exactly what the filter would keep, so a shelf reached by ⌘↵ cannot
 * show more than the ↵ beside it leaves on the page.
 */
const attributeItems = (library: Library, entry: AttributeEntry): OmniItem[] =>
  eachMedium((medium, module) => {
    const category = module.filters.categories.find((candidate) => (candidate.key as string) === entry.category);
    if (!category) return [];
    return module.toOmniItems(
      library[medium].filter((item) => {
        const cell = category.valueOf(item);
        return Boolean(cell) && attributeValue(entry.category, cell) === entry.value;
      }),
    );
  }).flat();

/**
 * The member that stands for a work: a show's latest season, otherwise its only row's first.
 *
 * The medium is named outright, as the cast on the line below already does: the sort reads a
 * season's number off the source, so this branch knows what it is holding either way.
 */
const representative = (members: OmniItem[]): OmniItem =>
  members[0].medium === "show"
    ? members.toSorted((a, b) => (b.source as Season).s - (a.source as Season).s)[0]
    : members[0];

/**
 * What a hit can be found by besides its name, asked of the item's own module: the people and
 * places a reader remembers a work by when the title escapes them. Blank cells are dropped, since
 * a blank matches nothing but would still be scanned.
 */
const secondaryText = (item: OmniItem): string[] => moduleOf(item).secondaryText(item.source);

/**
 * The line a hit is told by: the facts its hover card leads with, in each medium's own words.
 * Hours over every row of the work, so a show's are its seasons' together.
 */
const factsOf = (item: OmniItem, members: OmniItem[]): string => moduleOf(item).facts(item.source, omniHours(members));

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
 * A group's hits cut to what it shows, with the count before the cut — `rankHits`' own answer, for
 * a list already ranked and then expanded. One genre becomes a hit per tab that holds the
 * category, so the cut has to fall after the expansion or a group would state a total it had
 * already stopped counting at.
 */
const cutHits = <T>(hits: Hit<T>[], limit: number) => ({ hits: hits.slice(0, limit), total: hits.length });

/**
 * The palette's answer to a query: franchises first, then each medium's works in the tabs' own
 * order, a group with nothing to say left out. Franchises lead because they are the one kind of
 * hit that answers with more than itself.
 */
export const searchUnion = (
  index: SearchIndex,
  query: string,
  /** Which tab the box is standing over, and what its own schema can narrow by. */
  page?: { tabId: string; categories: readonly string[] },
  limit = HITS_PER_GROUP,
): SearchGroup[] => {
  const placed = page
    ? rankHits(index.attributes, query, limit).hits.flatMap(({ entry, matched }) =>
        attributePlacements(entry, page.tabId, page.categories).map((hit) => ({ entry: hit, matched })),
      )
    : [];

  const groups: SearchGroup[] = [
    // The two lead: a query that names a genre is asking what the page can be narrowed to more
    // often than it is asking for a work called Comedy, and the narrowing is the answer no other
    // surface on the page offers from the keyboard.
    {
      key: "filter-here",
      label: "Filter this page",
      ...cutHits(
        placed.filter((hit) => hit.entry.here),
        limit,
      ),
    },
    {
      key: "filter-there",
      label: "Go to, filtered",
      ...cutHits(
        placed.filter((hit) => !hit.entry.here),
        limit,
      ),
    },
    { key: "franchise", label: "Franchises", ...rankHits(index.franchises, query, limit) },
    ...media.map((medium) => ({
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
  worksOf(
    items.filter((item) => item.franchise === franchise),
    today,
  );

/**
 * A set of the union's rows as one card per work, newest first — what a layer listing an arbitrary
 * slice of the library shows.
 *
 * The gallery's own collapse, asked for a shelving that cannot split anything: every row of a work
 * carries that work's franchise, so grouping by franchise before collapsing by work leaves each
 * work whole and the flattened result is one card apiece whatever the slice was chosen by.
 */
const worksOf = (items: OmniItem[], today: YearMonthDay): ShelfItem[] =>
  galleryStripOrder(galleryWorks(items, "franchise", today), "recent");

/** The works an attribute holds, for the shelf ⌘↵ opens over all four libraries at once. */
export const attributeWorks = (library: Library, entry: AttributeEntry, today: YearMonthDay): ShelfItem[] =>
  worksOf(attributeItems(library, entry), today);

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
