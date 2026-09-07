import { rankHits, type Hit, type Searchable } from "../common/searchData";
import { categoryValues, FRANCHISE_KEY, groupHolds, selectedPredicates } from "../common/filterSchema";
import { franchiseIndex } from "../common/franchiseIndex";
import { YearMonthDay, type Year } from "../common/date";
import { mediumToLabel, type Medium } from "../utils/types";
import { eachMedium, MEDIA, moduleOf } from "./media";
import type { Season } from "../show/types";
import { countByMedium, type OmniItem } from "../common/medium";
import type { PageAction } from "../common/filterReducer";
import { omniHours, type Library } from "./library";
import { galleryGroups, galleryStripOrder, galleryWorks, isSeries, workOf, type ShelfItem } from "./galleryData";
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
  /**
   * How many works the view lists, which is what its own reading is worded by.
   *
   * Not `size`, which counts the union's entries — a season each, as the strip's caption does and
   * as the ranker breaks ties on. A reading says what pressing it shows, and the view collapses a
   * show to one card, so a franchise of three seasons and a film states three and not four.
   */
  works: number;
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
 * control surface does not draw. Franchise is one of these too, but built from the franchise index
 * rather than scanned out of the column (`franchiseAttribute`), the column being mostly works
 * naming themselves.
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
  /**
   * The level this entry stands for, where it stands for one — the `FilterGroup`'s own label, so a
   * company entry says it is a company rather than leaving a reader to infer it from a `label`
   * differing from its category's. It is what the swatch is looked up through, and what the sweep
   * holding a group of one to its value tests.
   */
  level?: string;
  counts: Partial<Record<Medium, number>>;
  values: Partial<Record<Medium, string[]>>;
}

/**
 * An attribute on one particular tab, which is what a hit actually is: the same genre reads as
 * "filter this page" where the reader is and as "Shows · Comedy" where they are not.
 *
 * A clone per tab rather than a tab carried beside the hit, so a reading knows the whole of what
 * pressing it does. The clone is made after ranking, whose fold cache is keyed on the entries the
 * ranker was handed.
 */
export interface PlacedAttribute extends AttributeEntry {
  /** The tab the hit acts on. */
  tab: string;
  /** Its medium, absent for the tab that is no medium — whose values are the union's own. */
  medium?: Medium;
  /** Whether that tab is the one being read, which is what ↵ does something different for. */
  here: boolean;
}

/**
 * One value the box found, with every reading of it: the layer it opens, the page it narrows, and
 * each tab it can be carried to.
 *
 * One entry rather than one per reading, because the readings differ only in what pressing them
 * does — the name, the mark and the counts are the same value said again. Stated once with its
 * readings beneath it, a genre recorded in four libraries is a line and a strip of about 105px,
 * where six rows under three headers are 444 on a list area of 500 and a phone's 416.
 *
 * `franchise` is the series behind the value where there is one: what its layer reading opens, and
 * where the years beside its name come from. An attribute has neither, and opens a shelf over
 * every library recording it instead.
 */
export interface ValueSearchEntry {
  kind: "value";
  key: string;
  attribute: AttributeEntry;
  franchise?: FranchiseSearchEntry;
  /** The tab being read first, as `attributePlacements` orders them. */
  placements: PlacedAttribute[];
}

/**
 * A category as something a reader can name: "genre", "gameplay", "director".
 *
 * The values themselves are already in the index, so this holds none of them — what it is for is
 * to be *found*, and pressing it holds the box to its category rather than opening anything.
 * `name` is the category's own label, which is the whole of what it matches on, and `size` is how
 * many values it holds, which is what a tie between two named categories falls to.
 */
export interface CategorySearchEntry extends Searchable {
  key: string;
  /** The schema field its values are held on, which is what scoping the box names. */
  category: string;
}

export type SearchEntry = ItemSearchEntry | ValueSearchEntry;

export interface SearchIndex {
  franchises: FranchiseSearchEntry[];
  items: ItemSearchEntry[];
  attributes: AttributeEntry[];
  /** The categories those attributes belong to, as things a query can name. */
  categories: CategorySearchEntry[];
  /**
   * Per medium, how many of that tab's own rows each franchise its own picker offers holds.
   *
   * Two answers a franchise hit needs and the union cannot give. The counts are the tab's rows and
   * not the union's items, where a show is one row and the seasons the union flattens it to are
   * several; and the keys are `franchiseOptions`' own set, which drops a franchise every row of
   * that tab names itself — so a hit is only placed where the tab it lands on can draw a chip for
   * it, and a filter nothing offers or clears is not set.
   */
  franchiseRows: Partial<Record<Medium, Map<string, number>>>;
}

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
const franchiseRowsByMedium = (library: Library): Partial<Record<Medium, Map<string, number>>> => {
  const byMedium: Partial<Record<Medium, Map<string, number>>> = {};
  eachMedium((medium, module) => {
    const rows = library[medium];
    const category = module.filters.categories.find((candidate) => (candidate.key as string) === FRANCHISE_KEY);
    if (!rows || !category) return;
    const offered = new Set(categoryValues(category, rows));
    const counts = new Map<string, number>();
    for (const row of rows) {
      const franchise = category.valueOf(row);
      if (offered.has(franchise)) counts.set(franchise, (counts.get(franchise) ?? 0) + 1);
    }
    byMedium[medium] = counts;
  });
  return byMedium;
};

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
        works: new Set(members.map(workOf)).size,
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

  const attributes = buildAttributeIndex(library);

  return {
    franchises,
    items: workEntries,
    attributes,
    categories: buildCategoryIndex(attributes, franchises),
    franchiseRows: franchiseRowsByMedium(library),
  };
};

/**
 * A franchise as a narrowing: the same value every tab's own `franchiseCategory` offers, in the
 * shape `attributePlacements` and `attributeAction` already read.
 *
 * Derived from a ranked franchise rather than scanned out of the column, so a franchise carries
 * all three readings a genre does — the view over the whole series, this page narrowed to it, and
 * another page narrowed to it — without the column's self-naming rows reaching any of them. Each
 * medium's own value is the franchise itself, that column holding one notation.
 *
 * Its counts are `franchiseRows`, each tab's own rows, and not the ranked entry's, which are the
 * union's: the facts line is worded in the tab's noun, so a show has to count once and not once a
 * season. A medium absent from that map contributes nothing, which is what keeps a hit off a tab
 * whose picker does not offer the value — with none of them offering it the entry has no counts at
 * all, `attributePlacements` yields nothing, and the franchise keeps its view and no narrowings.
 */
const franchiseAttribute = (entry: FranchiseSearchEntry, rows: SearchIndex["franchiseRows"]): AttributeEntry => {
  const counts: Partial<Record<Medium, number>> = {};
  const values: Partial<Record<Medium, string[]>> = {};
  for (const medium of media) {
    const held = rows[medium]?.get(entry.franchise);
    if (held === undefined) continue;
    counts[medium] = held;
    values[medium] = [entry.franchise];
  }

  return {
    kind: "attribute",
    key: `attribute:${FRANCHISE_KEY}:${entry.franchise}`,
    category: FRANCHISE_KEY,
    label: FRANCHISE_KEY,
    value: entry.franchise,
    name: entry.franchise,
    secondary: [],
    size: entry.size,
    counts,
    values,
  };
};

/**
 * What the box can find, with a count per medium: one entry per category value, plus one per
 * toggle that names a set worth opening, over each medium's own schema and its own rows.
 *
 * Built beside the work index and with it, since both are a pass over the libraries and a
 * keystroke should cost a scan of strings already assembled. A blank cell is skipped — a category
 * a medium answers `""` to is a hit nobody could name — and so is every category a tab's own
 * control surface would not draw, since the box offers exactly the narrowings the page holds.
 *
 * An entry is keyed on the category's own key and the value, so two tabs recording the same thing
 * under the same word — anime, which Shows and Movies both split by — fold into one entry a single
 * shelf opens and both tabs can be narrowed to.
 */
export const buildAttributeIndex = (library: Library): AttributeEntry[] => {
  const found = new Map<string, AttributeEntry>();

  const record = (
    key: string,
    fields: Pick<AttributeEntry, "category" | "label" | "value" | "level">,
    medium: Medium,
    cell: string,
  ) => {
    const entry = found.setIfAbsent(key, {
      kind: "attribute" as const,
      key,
      ...fields,
      name: fields.value,
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
  };

  eachMedium((medium, module) => {
    for (const category of module.filters.categories) {
      // The values that category calls worth finding: all of them unless it says otherwise, which
      // franchise does with none and a split with its marked half alone.
      const found = category.found;
      if (found?.length === 0) continue;
      for (const item of library[medium]) {
        const cell = category.valueOf(item);
        if (!cell) continue;
        const value = category.foundAs?.(cell) ?? cell;
        if (found && !found.includes(value)) continue;
        record(
          `attribute:${category.key}:${value}`,
          { category: category.key, label: category.label, value },
          medium,
          cell,
        );
        // The level above the values, where the category has one, so "Nintendo" is a hit setting
        // the seven platforms under it — the same narrowing its own parent chip makes, since both
        // readers write the category's own flat list. Keyed under the level's name and not the
        // value's, a group being free to share a name with one of its children.
        const level = category.group;
        if (level) {
          const group = level.of(value);
          record(
            `attribute:${category.key}:${level.label}:${group}`,
            { category: category.key, label: level.label, value: group, level: level.label },
            medium,
            cell,
          );
        }
      }
    }
  });

  // A group of one is its value, through the rule the control surface draws its runs by: PC, iOS
  // and Xbox each hold a single platform, and an entry for one is the same rows under a second
  // name, ranked beside the first and filtering to exactly what it filters to.
  return [...found.values()].filter((entry) => !entry.level || groupHolds(Object.values(entry.values).flat()));
};

/**
 * Whether an entry is one of its category's values rather than the level above them.
 *
 * A company stands for a set of platforms and is not one, so it is neither counted as a value nor
 * listed as one — asked separately in the two places, a category could state 15 over 17 rows.
 */
const isValue = (entry: AttributeEntry) => !entry.level;

/**
 * The categories the index holds values for, as entries a query can name.
 *
 * Derived from the attribute index rather than walked out of the schemas a second time, so what a
 * category says it holds and what scoping it lists are one array: a count arrived at separately is
 * a count that can disagree with the rows under it.
 *
 * A level is skipped. A company stands for a set of the category's values rather than being one of
 * them, so counting it would state 17 platforms over the 15 the scope lists — the first thing a
 * reader notices. Franchise is added from its own index, its values being deliberately absent from
 * the attribute one (`found: []`).
 *
 * A category of one findable value is that value, through the rule the filter chips group by:
 * Shows' and Movies' anime split offers a single word, so its category row and its value row would
 * be the same row twice.
 */
const buildCategoryIndex = (
  attributes: AttributeEntry[],
  franchises: FranchiseSearchEntry[],
): CategorySearchEntry[] => {
  const held = new Map<string, { label: string; values: string[] }>();
  for (const entry of attributes.filter(isValue)) {
    held.setIfAbsent(entry.category, { label: entry.label, values: [] }).values.push(entry.value);
  }
  if (franchises.length > 0) {
    held.set(FRANCHISE_KEY, { label: FRANCHISE_KEY, values: franchises.map((entry) => entry.franchise) });
  }

  return [...held]
    .filter(([, category]) => groupHolds(category.values))
    .map(([key, category]) => ({
      key: `category:${key}`,
      category: key,
      name: category.label,
      secondary: [],
      size: category.values.length,
    }));
};

/**
 * The values one category holds, as the box lists them once a reader has named it.
 *
 * Franchise reads its own index and every other category the attribute one, less the levels —
 * exactly the set `buildCategoryIndex` counted, so the header's figure and the rows beneath it
 * cannot come apart.
 */
const scopeValues = (index: SearchIndex, category: string): (AttributeEntry | FranchiseSearchEntry)[] =>
  category === FRANCHISE_KEY
    ? index.franchises
    : index.attributes.filter(isValue).filter((entry) => entry.category === category);

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
      ? [{ ...entry, tab: currentTabId, medium: currentMedium, here: true }]
      : [];

  const elsewhere = tabs
    .filter((medium) => MEDIA[medium].tabId !== currentTabId)
    .map((medium): PlacedAttribute => ({ ...entry, tab: MEDIA[medium].tabId, medium, here: false }));

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
 * also what makes the shelf exactly what the filter would keep, so a shelf cannot show more than
 * the narrowing beside it leaves on the page.
 *
 * Held to the cells the entry *sets* on that medium, through the very predicate that tab's own
 * picker would filter by, so the shelf and the narrowing beside it cannot answer with different
 * rows. Read the other way — the cell put back through the category's own fold and compared to its
 * name — an entry whose name is no cell shelves nothing: a company stands for its platforms and
 * matches none of them.
 */
const attributeItems = (library: Library, entry: AttributeEntry): OmniItem[] =>
  eachMedium((medium, module) => {
    const category = module.filters.categories.find((candidate) => (candidate.key as string) === entry.category);
    const values = entry.values[medium];
    if (!category || !values) return [];
    // A recorded medium always pushed a cell, so the list is never the empty selection that
    // `selectedPredicates` answers with no predicate at all.
    const [matches] = selectedPredicates(values, category.valueOf);
    return module.toOmniItems(library[medium].filter(matches));
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
const HITS_PER_GROUP = 5;

/**
 * How many values draw their readings without being asked.
 *
 * One value or two is the common case and arrives open, so a finger never pays a tap for nothing.
 * Past that only the value the reader is on draws its strip: four values' worth of chips is most
 * of the list before a single work is reached, and a query vague enough to match that many is one
 * the reader is still scanning. At `Infinity` every value draws its strip always, which is the
 * layout without this rule at all.
 */
export const OPEN_STRIP_LIMIT = 2;

/**
 * How many of a scoped category's values are drawn.
 *
 * Every vocabulary a reader can scan is whole inside it, and the cut bites only on the six past
 * sixty — the split `FilterCategory.searchable` is measured against, counted there rather than a
 * second time here. Those six are the ones the scope's own argument says you type into rather than
 * scroll, and 218 rows is that phone book drawn out rather than described: about eleven elements
 * apiece, which is a render the reader waits through to reach a list nobody reads to the end of.
 *
 * The header states the cut through `cut`, as every other group does, so what is held back says so
 * in the app's own sentence and the field beneath it is the way to the rest.
 */
export const SCOPE_ROWS = 50;

/** Which tab the box is standing over, and what its own schema can narrow by. */
export interface PageOver {
  tabId: string;
  categories: readonly string[];
}

/**
 * One ranked value with its readings worked out, keeping the rank the merge is ordered on and the
 * run of the name the query matched — which indexes the value either way, `franchiseAttribute`
 * naming its entry after the franchise the ranker matched.
 */
const valueHit = (
  index: SearchIndex,
  hit: Hit<AttributeEntry | FranchiseSearchEntry>,
  page: PageOver | undefined,
): Hit<ValueSearchEntry> => {
  // A franchise is lifted to the narrowing shape here rather than by each caller: three groups are
  // built over these two indexes, and a rule stated once per group is a rule three ways to get
  // wrong. It is also what the callers' own comments claim — that a value reached one way and the
  // same value reached another are one thing on screen — which only construction can promise.
  const franchise = hit.entry.kind === "franchise" ? hit.entry : undefined;
  const attribute = franchise ? franchiseAttribute(franchise, index.franchiseRows) : (hit.entry as AttributeEntry);
  return {
    rank: hit.rank,
    matched: hit.matched,
    entry: {
      kind: "value",
      key: `value:${attribute.key}`,
      attribute,
      franchise,
      placements: page ? attributePlacements(attribute, page.tabId, page.categories) : [],
    },
  };
};

/**
 * The palette's answer to a query: the values it matched, then the works themselves. A group with
 * nothing to say is left out.
 *
 * The values lead because a value answers with more than itself — the whole library holding it,
 * the page narrowed to it, the tab it lives on — where a work is one card. They are one group and
 * not one per reading: a genre and the four tabs recording it are one thing said five ways, so the
 * box states the value once and hangs the readings under it.
 *
 * Franchises and attributes are ranked apart, since they are two indexes, and merged into one list
 * rather than concatenated: a genre matching a query exactly is a better answer than a series
 * matching it at a word start, and the reverse holds as readily. Each is ranked over its whole
 * index and the merge cut afterwards — cutting each half first would state a total it had stopped
 * counting at, and would drop attributes the group had room for on a query franchises answered
 * better. Franchises lead the merge and the sort is stable, so a franchise takes a tie: its view
 * says more about a value than a shelf of works does.
 */
export const searchUnion = (
  index: SearchIndex,
  query: string,
  page?: PageOver,
  limit = HITS_PER_GROUP,
): SearchGroup[] => {
  const attributes = rankHits(index.attributes, query, limit);
  const franchises = rankHits(index.franchises, query, limit);

  // Merged rather than concatenated, then cut, and only the survivors have their readings worked
  // out: a hit in the merged top N has fewer than N ahead of it and so fewer than N from its own
  // half, which is what lets each half be cut at the same figure first. The totals are still the
  // whole indexes', `rankHits` counting what it matched before its own cut, so the merged group
  // states what it is showing five of rather than a figure it stopped counting at.
  const ranked = [...franchises.hits, ...attributes.hits]
    .toSorted((a, b) => (a.rank ?? Infinity) - (b.rank ?? Infinity))
    .slice(0, limit);
  const values = ranked.map((hit) => valueHit(index, hit, page));

  const groups: SearchGroup[] = [
    {
      key: "values",
      label: "Genres, tags and series",
      hits: values,
      total: franchises.total + attributes.total,
    },
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

/** The works an attribute holds, for the shelf its own row opens over every library recording it. */
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
 * One category's values, which is what Find lists once the reader has named it.
 *
 * Ranked where something is typed and biggest first where nothing is: `rankHits` answers an empty
 * phrase with nothing at all, and a scope opened on a blank field is a browse rather than a query.
 * Cut at `SCOPE_ROWS` either way, which is far above `HITS_PER_GROUP`: this is a vocabulary the
 * reader asked to see rather than a ranked answer with more behind it, and every vocabulary short
 * enough to scan comes back whole.
 *
 * The rows are the value rows a query already answers with, through `valueHit`, so a genre reached
 * by scoping Genre and the same genre reached by typing its name are one thing on screen.
 */
export const searchScope = (index: SearchIndex, category: string, query: string, page?: PageOver): SearchGroup[] => {
  const held = index.categories.find((entry) => entry.category === category);
  if (!held) return [];

  const values = scopeValues(index, category);
  const ranked = query.trim() ? rankHits(values, query, SCOPE_ROWS) : undefined;
  const hits =
    ranked?.hits ??
    values
      .toSorted((a, b) => b.size - a.size)
      .slice(0, SCOPE_ROWS)
      .map((entry) => ({ entry }));

  // `total` is what was matched rather than what the vocabulary holds, as every other group's is:
  // the header reads `cut(shown, total)`, so a scope of 218 narrowed to one director saying
  // "1 of 218" claims 217 answers are held back that no scrolling produces. With nothing typed the
  // two are the same figure. A group with nothing in it goes, on the rule `searchUnion` ends with —
  // a header stating "0" above the line saying nothing was found is the box answering twice.
  return hits.length === 0
    ? []
    : [
        {
          key: "scope",
          label: held.name,
          total: ranked?.total ?? values.length,
          hits: hits.map((hit) => valueHit(index, hit, page)),
        },
      ];
};

/**
 * Those franchises as the values they are, which is what the box offers before a letter is typed.
 *
 * The same shape a typed query answers with: a franchise offered here and the same franchise found
 * by name are one thing, and drawn two ways they read as two — a row that opens the view in one
 * place and a value with three readings in the other. Nothing is ranked, these being shown because
 * they are worth offering rather than because they answered, so the hits carry no rank and no
 * matched run.
 *
 * A franchise the index no longer holds — one hidden by guest mode since — is dropped rather than
 * shown as a blank, and with none left there is no group: a list of groups rather than one, so the
 * box draws what it offers and what a query answers with through one mapping.
 */
export const recentValues = (
  index: SearchIndex,
  items: OmniItem[],
  today: YearMonthDay,
  page: PageOver | undefined,
): SearchGroup[] => {
  const byName = new Map(index.franchises.map((entry) => [entry.franchise, entry]));
  const lately = recentFranchises(items, today, HITS_PER_GROUP)
    .map((franchise) => byName.get(franchise))
    .filter((entry) => entry !== undefined);

  if (lately.length === 0) return [];
  return [
    {
      key: "lately",
      label: "Franchises met lately",
      total: lately.length,
      hits: lately.map((entry) => valueHit(index, { entry }, page)),
    },
  ];
};

/**
 * Where a franchise's context bar opens: the first of January of the earliest year anything in
 * the union was attributed to, so every franchise view brackets its window on one scale and two
 * views are comparable. An attribution year is an end year, so a franchise begun earlier opens its
 * own window before this; the strip widens the bar's scale to the window in that case rather than
 * clamping the entry, and only the bar's left label differs between such a view and the rest.
 */
export const unionEpoch = (items: OmniItem[], today: YearMonthDay): YearMonthDay =>
  YearMonthDay.get(items.length ? Math.min(...items.map((item) => item.year)) : today.year, 1, 1);
