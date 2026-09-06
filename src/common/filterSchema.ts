import { categoryOptions, franchiseOptions } from "./filterOptions";
import {
  ANIME,
  animeToColour,
  franchiseToColour,
  type Colour,
  type KeysMatching,
  type Predicate,
  type Scheme,
} from "../utils/types";

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
 * One multi-select over a category's values.
 *
 * `options` defaults to the distinct values across the data; a category states its own only where
 * the plain set is wrong — a franchise column repeating a standalone item's own name, a blank
 * nobody can name. `colourFor` is present exactly where the app already speaks that field's colour
 * elsewhere, so a chip and a wedge naming one value are one colour, and absent where a swatch
 * would teach a legend no chart honours.
 *
 * `searchable` says the vocabulary is long enough that a reader picks from it by typing rather
 * than by scanning — the people and series a library holds hundreds of.
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
  options?(data: readonly T[]): string[];
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
 * The franchise select, which every tab offers on the same terms: the column each sheet writes a
 * series into, and — where the entry names no series — the item's own title, which
 * `franchiseOptions` erases so the list holds only what actually groups anything.
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
  options: (data) =>
    franchiseOptions(
      data,
      (item) => item.franchise,
      (item) => item.name,
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
export const categoryValues = <T, S>(category: FilterCategory<T, S>, data: readonly T[]): string[] =>
  category.options ? category.options(data) : categoryOptions(data, (item) => category.valueOf(item));

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
): { values: string[]; counts: Map<string, number> } => {
  const counts = new Map<string, number>();
  for (const item of data) {
    const value = category.valueOf(item);
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }

  return { values: category.options ? category.options(data) : [...counts.keys()].toSorted(), counts };
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
