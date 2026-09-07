import { categoryOptions, franchiseOptions } from "./filterOptions";
import {
  ANIME,
  certificateBand,
  isCertificate,
  animeToColour,
  franchiseToColour,
  type Colour,
  type KeysMatching,
  type Predicate,
  type Scheme,
} from "../utils/types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/**
 * A tab's own field holding a boolean, which is the only kind a toggle can name, and one holding a
 * list of chosen values, which is the only kind a category can. Stated as a constraint rather than
 * left to the writer, because a key naming the wrong field is a filter that silently never applies
 * — the schema compiles, the control draws, and nothing it does reaches the predicate.
 *
 * Intersected with `string` rather than extracted from it, so a key still reads as a string where
 * `S` is generic and the conditional inside `KeysMatching` has not been reduced.
 *
 * Exported because the reducer subtracts them: the schema seeds a starting value for every field
 * these two name, so what a domain still has to state is everything else its state holds.
 */
/**
 * A page's state read by field name.
 *
 * A tab's own fields are erased off the shape every shared surface holds it through — a schema, a
 * store, a control drawing one category — and a key is checked against the field it names where
 * the schema is written. Reading `S[ToggleKey<S>]` back out of a generic `S` is a lookup TypeScript
 * cannot reduce, so the assertion is made once here rather than at each surface that indexes a
 * state by a key it was handed.
 */
export const fieldsOf = (state: unknown): Record<string, unknown> => state as Record<string, unknown>;

export type ToggleKey<S> = KeysMatching<S, boolean> & string;
export type CategoryKey<S> = KeysMatching<S, readonly string[]> & string;

/**
 * One boolean filter, as data: which field of the tab's state holds it, what it is called, and
 * what the page keeps while it is off.
 *
 * `hides` is applied **while the toggle is off** and answers true for an item that stays, which is
 * every predicate's direction here — the name says what turning the toggle off does, not what the
 * function returns.
 *
 * A toggle names a page's own noise — unconfirmed dates, unscored films, a medium switched off —
 * and its two states are "everything" and "these rows dropped", with none meaning "these rows
 * alone". A two-valued split is therefore a category and not a toggle however few values it has:
 * three readings, and a toggle can hold two of them.
 *
 * No icon: the surface drawing these is a row of chips reading the label, and an icon on a chip
 * a word already names is a picture standing for a word beside it. A schema is also reachable from
 * the shell, so an icon named here would put every tab's filter glyphs in the first bundle a
 * visitor downloads.
 */
export interface FilterToggle<T, S> {
  key: ToggleKey<S>;
  label: string;
  hides(item: T): boolean;
}

/**
 * A second level over a category's values, where the vocabulary has one.
 *
 * Fifteen platforms are five companies, and "all my Nintendo games" is the narrowing a reader
 * actually means — seven chips pressed in a row otherwise, with nothing on the surface saying they
 * belong together. The level is a way of selecting several values at once and never a value of its
 * own: the state stays the category's own flat list, so the reducer, the sweep, the predicate and
 * the badge all see exactly what they saw before.
 *
 * **A group of one is its value.** Three of the five companies here hold a single platform, so a
 * parent above one child is that child said twice — every reader of this level draws such a value
 * loose and indexes nothing for the group.
 */
export interface FilterGroup {
  /** What the level is called — "company", where the values are platforms. */
  label: string;
  /** The group a value belongs to. */
  of(value: string): string;
  /**
   * The group's own colour, where the app speaks one. The parent carries the vocabulary for its
   * whole run, so a grouped child draws no swatch: fifteen platforms wear five company colours, and
   * a chip repeating its parent's fill five times says the colour means the platform.
   */
  colourFor?(group: string, scheme: Scheme): Colour | undefined;
  /**
   * How a value names itself under its parent, where its own name repeats the group's: a run led by
   * a Nintendo chip reads DS, Wii, GBA, and the app's own short form is what a corner chip on a card
   * already says. Applied to grouped children alone — a value standing loose keeps its whole name,
   * since nothing beside it carries the half a short form drops.
   */
  labelFor?(value: string): string;
}

/**
 * One multi-select over a category's values.
 *
 * `options` defaults to the distinct values across the data; a category states its own only where
 * the plain set is wrong — a franchise column repeating a standalone item's own name, a blank
 * nobody can name. `colourFor` is present exactly where the app already speaks that field's colour
 * elsewhere, so a chip and a wedge naming one value are one colour, and absent where a swatch
 * would teach a legend no chart honours.
 *
 * `searchable` says the vocabulary is long enough that a reader picks from it by typing rather
 * than by scanning — the people, networks and series a library holds hundreds of. The library
 * splits cleanly on it: format 4, certificate 5, genre 12, gameplay 14 and platform 15 against
 * series 64, author 65, network 77, publisher 92, director 218 and franchise 225.
 *
 * Every accessor is a method rather than a property, which is what lets a `FilterSchema<Show, …>`
 * sit in a record whose element type names no domain: TypeScript checks a method's parameters
 * bivariantly, where a property-typed accessor is contravariant in its item and would leave every
 * domain's schema unassignable to the erased shape a surface above the tabs reads.
 */
export interface FilterCategory<T, S> {
  key: CategoryKey<S>;
  label: string;
  valueOf(item: T): string;
  options?(data: readonly T[], context?: CategoryContext): string[];
  colourFor?(value: string, scheme: Scheme): Colour | undefined;
  searchable?: boolean;
  /**
   * The values the box indexes as attributes, where only some of them are worth finding. Defaults
   * to all of them: a genre, a network, an author is a thing a reader goes looking for.
   *
   * A split's unmarked half is not. "Show" on the Shows tab names the tab, so a shelf of it is the
   * library less a few rows and its hit stands beside the Go-to chip for the tab of the same name
   * saying nearly the opposite. Franchise states the empty list for a different reason: its values
   * are found through the franchise index, which drops the standalone works that make up most of
   * the column.
   */
  found?: readonly string[];
  /**
   * The value a cell is found under, where the two differ; the cell itself by default.
   *
   * The certificate is the one vocabulary this is true of: BBFC issues a 15 where PEGI issues a 16,
   * one tier under two numbers, so a single hit narrows each tab to whichever notation that tab's
   * own rows carry. Stated beside the category's options and its colours rather than in the index,
   * so nothing there knows a particular category by name and a second vocabulary that folds brings
   * its own rule with it.
   */
  foundAs?(cell: string): string;
  /** The level above the values, where the vocabulary has one. */
  group?: FilterGroup;
}

/**
 * A stated vocabulary held to what the rows carry, in the order it was stated in.
 *
 * One pass rather than one per value: `categoryTally` scans the library for its counts already, and
 * a category asking again per value turns the Omnibus's certificate row into six passes over the
 * union for what one Set answers.
 */
export const present = <T>(values: readonly string[], data: readonly T[], valueOf: (item: T) => string): string[] => {
  const seen = new Set(data.map(valueOf));
  return values.filter((value) => seen.has(value));
};

/** The key every tab's franchise select is held on, and the one a franchise hit is placed by. */
export const FRANCHISE_KEY = "franchise";

/**
 * The key a shared category is built on, checked against the state of the tab it is going into.
 *
 * Intersected with the literal so the helper still fixes the key — two tabs keying one vocabulary
 * apart would be two entries in the box's index where the fold wants one — while `CategoryKey<S>`
 * is what holds the tab to declaring the field. A helper stating the key inside itself has neither:
 * `S` reaches `FilterCategory` only under `keyof` a mapped type, which TypeScript measures as
 * independent, so the assignment a bare literal is caught by is not made at all and a state missing
 * the field compiles into a filter that draws and never applies.
 */
type SharedKey<S, K extends string> = CategoryKey<S> & K;

/**
 * What a category's vocabulary needs that its own rows cannot say.
 *
 * Declared here and filled in `app/`, as `OmniItem` and `FranchiseEntry` are: a tab holds one
 * library and some questions about a value are questions about all four. The whole bag is what a
 * caller omits — absent means the union has not landed and each picker falls back to its own rows,
 * where a present bag missing its one member would be a third state nothing intends.
 */
export interface CategoryContext {
  /** The franchises the whole library knows to be series, by `isSeries` — see `franchiseOptions`. */
  series: ReadonlySet<string>;
}

/**
 * The franchise select, which every tab offers on the same terms: the column each sheet writes a
 * series into, and — where the entry names no series — the item's own title, which
 * `franchiseOptions` erases so the list holds only what actually groups anything. Which those are
 * is the library's answer and not this tab's, so it reads `context.series` where the caller has
 * one: a tab holding a single entry of a series otherwise erases it.
 *
 * Stated once rather than per tab, so the five cannot disagree about what belongs on that list.
 * The state it names is the one field it needs, and a category is covariant in its key, so it sits
 * in any tab's schema whose own state holds a `franchise` list.
 */
export const franchiseCategory = <T extends { franchise: string; name: string }, S>(
  key: SharedKey<S, typeof FRANCHISE_KEY>,
): FilterCategory<T, S> => ({
  key,
  label: "franchise",
  valueOf: (item) => item.franchise,
  options: (data, context) =>
    franchiseOptions(
      data,
      (item) => item.franchise,
      (item) => item.name,
      context?.series,
    ),
  // The table `utils/types.ts` shares across the tabs, so a chip and the wedge, bead or shelf
  // naming one series are one colour. Most of the column is a work naming itself and answers `""`,
  // which is the plain chip every other uncoloured value already wears.
  colourFor: (value, scheme) => franchiseToColour({ franchise: value }, scheme) || undefined,
  searchable: true,
  // Found through the franchise index instead, which holds the column to the values that actually
  // group something: a scan of it would offer every standalone work as a series to narrow by.
  found: [],
});

/**
 * The anime split, which Shows and Movies both record, both colour and both group charts by.
 *
 * Stated once because the box folds the two tabs' entries on the key and the word together: keyed
 * or worded apart, "Anime" would be two hits holding one medium each instead of one shelf holding
 * both. A category and not a toggle, so the page can be held to anime as well as cleared of it —
 * a toggle offers two of a split's three readings and which two is an accident of how its
 * predicate was written.
 *
 * Only the marked half is `found`: a shelf of "Show" is the Shows tab, and of "Film" the Movies
 * tab. `group` is the tab's own two words in the order its charts band them, the unmarked one
 * first — not "live action", the sheet claiming no such thing — and `valueOf` is the tab's own
 * labelling, both taken from the domain so the chips, the wedges and the band cannot come to word
 * one split three ways.
 */
export const animeCategory = <T, S>(
  key: SharedKey<S, "anime">,
  valueOf: (item: T) => string,
  group: readonly string[],
): FilterCategory<T, S> => ({
  key,
  label: "anime",
  valueOf,
  options: (data) => present(group, data, valueOf),
  colourFor: animeToColour,
  found: [ANIME],
});

/**
 * The certificate select, which every tab recording one offers on the same terms. Nothing certifies
 * a book, so the Books tab is the one that does not.
 *
 * `values` is the vocabulary that tab writes, in the order the boards print it, because
 * `categoryOptions` sorts lexicographically and a ramp a string sort runs "12, 15, 18, 3, 7". It is
 * the caller's rather than derived here: a medium tab offers the numbers its own sheet holds, and
 * the composing tab the bands, those being the only notation a page over four boards can group by.
 * Filtered to what the rows actually carry, so a board's unused number is not a chip that narrows
 * to nothing.
 */
export const certificateCategory = <T, S>(
  key: SharedKey<S, "certificate">,
  certificateOf: (item: T) => string,
  values: readonly string[],
  colourFor: (value: string, scheme: Scheme) => Colour,
): FilterCategory<T, S> => ({
  key,
  label: "certificate",
  valueOf: certificateOf,
  options: (data) => present(values, data, certificateOf),
  colourFor,
  // The band and not the cell, which is the gallery's own rule: grouping on the number would shelve
  // a PEGI 16 game apart from the BBFC 15 film it sits at the same age as. A cell outside the union
  // is left as itself — a converter rejects one while it still knows the row, and a value that
  // reached this far is better found under its own name than under a band it has no claim to.
  foundAs: (cell) => (isCertificate(cell) ? certificateBand(cell) : cell),
});

/** Everything a tab offers as a filter, in the order the surface drawing it lays the controls out. */
export interface FilterSchema<T, S> {
  toggles: readonly FilterToggle<T, S>[];
  categories: readonly FilterCategory<T, S>[];
}

/**
 * A schema as a surface above the tab reads it, with the domain's record and its state erased —
 * the arrangement `PageState` takes, for the same reason and by the same trick.
 *
 * `unknown` for the record because every accessor above is a method, so a schema over any record
 * is assignable to one over `unknown`. `never` for the state because `keyof never` is every key
 * there is, which each domain's own key union is a subset of. What the erasure costs is the
 * compile-time link between a key and the field it names, which is checked where the schema is
 * written and is not something a surface holding four of them could check anyway.
 */
export type PageSchema = FilterSchema<unknown, never>;

/**
 * The values a category's control offers: its own list where it states one, and otherwise every
 * distinct value in the data. Asked here rather than at each reader, so the box that filters a page
 * and the index of what can be found by attribute cannot offer two different vocabularies for one
 * category.
 */
export const categoryValues = <T, S>(
  category: FilterCategory<T, S>,
  data: readonly T[],
  context?: CategoryContext,
): string[] =>
  category.options ? category.options(data, context) : categoryOptions(data, (item) => category.valueOf(item));

/**
 * The same values with how many rows each of them holds, in one pass over the library.
 *
 * The control drawing a category states the figure inside each chip, so it needs both halves, and
 * a library of fifteen vocabularies is fifteen scans of every row — paid again on each render that
 * cannot be memoised past. Where the category states no list of its own the values are the tally's
 * own keys sorted as `categoryOptions` sorts them, which is the same distinct set by the same rule,
 * so the box and the search index still offer one vocabulary.
 */
export const categoryTally = <T, S>(
  category: FilterCategory<T, S>,
  data: readonly T[],
  context?: CategoryContext,
): { values: string[]; counts: Map<string, number> } => {
  const counts = new Map<string, number>();
  for (const item of data) {
    const value = category.valueOf(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return { values: category.options ? category.options(data, context) : [...counts.keys()].toSorted(), counts };
};

/** A line of a category's chips: a parent and the values it selects, or the values grouping nothing. */
export interface CategoryRun {
  /** The parent, absent on the run of values that stand alone. */
  group?: string;
  values: string[];
  /** The values to draw, where fewer are shown than the run holds; all of them otherwise. */
  shown?: string[];
  /** What pressing the parent selects, the sum of the children it holds — absent where there is no parent. */
  count?: number;
}

/**
 * **A group of one is its value**, which is the whole of what makes a level worth drawing.
 *
 * Three of the five companies here hold a single platform: a parent above one child selects exactly
 * the chip beside it, and its colour and its count both restate what that chip already says. The
 * control surface leaves such a value loose and the box indexes no entry for it, and this is the one
 * statement of the rule both read — counted over distinct values, since the box gathers a group's
 * children across the media recording them and one platform can be recorded by two.
 */
export const groupHolds = (values: readonly string[]): boolean => new Set(values).size > 1;

/**
 * Whether a run's whole membership is chosen, which is what lights its parent chip and what the
 * closed row folds to the group's own name. One test, so the chip and the row cannot disagree about
 * whether a company is held.
 *
 * Read over the values the *rows* still carry rather than the vocabulary's: widening the year scope
 * onto a platform the page had none of unlights the parent, which is right — there is now something
 * under Nintendo the reader has not picked — and worth knowing, nothing they pressed having moved.
 */
export const runIsWhole = (run: CategoryRun, chosen: readonly string[]): boolean =>
  run.group !== undefined && run.values.every((value) => chosen.includes(value));

/**
 * A category's values cut into the lines its chips are drawn on: one line per group holding more
 * than one value, in the order the values arrive, and then everything left over as one final line.
 *
 * Groups lead and the loose values trail rather than each run standing where its first value fell.
 * Three of the five companies here hold a single platform, so interleaved, PC, iOS and Xbox would
 * each take a line between two full ones — four lines to say what one says.
 *
 * `groupHolds` is what leaves those three loose, and a category with no level answers one run of
 * everything, so the surface draws the two kinds the same way rather than branching on which it has.
 */
export const categoryRuns = (
  values: readonly string[],
  counts: ReadonlyMap<string, number>,
  group: FilterGroup | undefined,
  /**
   * Which of them to draw, where a surface is showing fewer than the category holds.
   *
   * A run's membership is the whole vocabulary and its drawn chips are this — the two differ while
   * a phrase narrows the list, and reading a run off the narrowed set makes a parent whole because
   * the values it is missing are the ones off screen.
   */
  shown: readonly string[] = values,
): CategoryRun[] => {
  if (!group) return [{ values: [...values] }];

  const members = new Map<string, string[]>();
  for (const value of values) members.setIfAbsent(group.of(value), []).push(value);

  const runs: CategoryRun[] = [];
  const loose: string[] = [];
  for (const [name, held] of members) {
    if (groupHolds(held)) runs.push({ group: name, values: held, count: held.map((v) => counts.get(v) ?? 0).sum() });
    else loose.push(...held);
  }

  const all = loose.length > 0 ? [...runs, { values: loose }] : runs;
  if (shown === values) return all;

  // Narrowed for drawing alone: a run keeps the values it holds, so `runIsWhole` still asks about
  // the company, and only its chips are cut. A run with nothing left to draw goes.
  const visible = new Set(shown);
  return all
    .map((run) => ({ ...run, shown: run.values.filter((value) => visible.has(value)) }))
    .filter((run) => run.shown!.length > 0);
};

/**
 * The chosen values as the shortest true list of them: a group whose whole membership is chosen
 * reads as its own name.
 *
 * A reader who pressed one chip has to see one word in the row that chip closes behind — a closed
 * platform row naming seven consoles where a parent was pressed reads as a surface that did
 * something other than what was asked, and the seven then take the line the row has for one.
 *
 * Folded through `runIsWhole`, the same test the parent chip lights on.
 */
export const namedSelection = (chosen: readonly string[], runs: readonly CategoryRun[]): string[] => {
  const whole = runs.filter((run) => runIsWhole(run, chosen));
  const folded = new Set(whole.flatMap((run) => run.values));
  return [...whole.map((run) => run.group!), ...chosen.filter((value) => !folded.has(value))];
};

/**
 * A multi-select's predicate, or none where nothing is selected.
 *
 * Every category control in every domain means the same thing — an empty selection is no
 * constraint rather than a constraint nothing satisfies. Stated once, a change to what matching
 * means is one edit; stated per category per domain, it is fifteen, and fifteen chances to differ.
 *
 * Returns a list so a caller spreads it, which is what lets an inactive control contribute
 * nothing at all instead of a predicate that is always true.
 */
export const selectedPredicates = <T>(selected: readonly string[], valueOf: (item: T) => string): Predicate<T>[] =>
  selected.length > 0 ? [(item) => selected.includes(valueOf(item))] : [];

/**
 * The predicates a schema and a state compose to: each toggle's rule while that toggle is off, and
 * each category's selection where it holds one.
 *
 * A list rather than one predicate, so a domain spreads it alongside the rules that are not
 * per-field — a year cutoff, or a question only that domain's model can answer — and an inactive
 * control contributes nothing at all rather than a predicate that is always true.
 *
 * The state is indexed through `fieldsOf`, a schema naming a field by string alone.
 */
export const schemaPredicates = <T, S>(schema: FilterSchema<T, S>, state: Omit<S, "filter">): Predicate<T>[] => {
  const fields = fieldsOf(state);

  return [
    ...schema.toggles
      .filter((toggle) => !fields[toggle.key])
      .map(
        (toggle): Predicate<T> =>
          (item) =>
            toggle.hides(item),
      ),
    ...schema.categories.flatMap((category) =>
      selectedPredicates(fields[category.key] as readonly string[], (item: T) => category.valueOf(item)),
    ),
  ];
};
