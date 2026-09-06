import { categoryOptions, franchiseOptions } from "./filterOptions";
import type { Colour, KeysMatching, Predicate, Scheme } from "../utils/types";

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
}

/**
 * The franchise select, which every tab offers on the same terms: the column each sheet writes a
 * series into, and — where the entry names no series — the item's own title, which
 * `franchiseOptions` erases so the list holds only what actually groups anything.
 *
 * Stated once rather than per tab, so the five cannot disagree about what belongs on that list.
 * The state it names is the one field it needs, and a category is covariant in its key, so it sits
 * in any tab's schema whose own state holds a `franchise` list.
 */
export const franchiseCategory = <T extends { franchise: string; name: string }>(): FilterCategory<
  T,
  { franchise: string[] }
> => ({
  key: "franchise",
  label: "franchise",
  valueOf: (item) => item.franchise,
  options: (data) =>
    franchiseOptions(
      data,
      (item) => item.franchise,
      (item) => item.name,
    ),
  searchable: true,
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
 * The state is indexed through a record type: a key is checked against the field it names where
 * the schema is written, but reading `S[ToggleKey<S>]` back out of a generic `S` is a lookup
 * TypeScript cannot reduce, so the two assertions sit here rather than one per domain.
 */
export const schemaPredicates = <T, S>(schema: FilterSchema<T, S>, state: Omit<S, "filter">): Predicate<T>[] => {
  const fields = state as Record<string, unknown>;

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
