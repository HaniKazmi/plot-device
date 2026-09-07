import { namesTheSameThing } from "../utils/stringUtils";

/**
 * The distinct values a category takes across the data, for its multi-select.
 *
 * An accessor rather than a key, so a category that lives behind a derivation — a nested field,
 * a joined value — costs the caller a function instead of costing this layer a domain type.
 *
 * `toSorted` with no comparator sorts lexicographically, so an empty value sorts to the front
 * and renders as a blank option — nothing filters those out.
 */
export const categoryOptions = <T>(data: readonly T[], value: (item: T) => string) =>
  [...new Set(data.map(value))].toSorted();

/**
 * The franchise select's values: the franchises among this data that actually group something.
 *
 * `series` is the whole library's answer, and where a caller has one it is the whole test — the
 * values are that set intersected with what these rows carry. Which franchises are series is a
 * question about the library and not about one tab of it: Twilight is four books and one film, and
 * the film is named "Twilight", so a tab asking only its own rows offers the series on Books and
 * not on Movies. Code Geass is the same shape the other way round, and Project Hail Mary — a novel
 * and the film of it — is a series neither tab would offer.
 *
 * Without one the fallback is that per-tab reading: erase a value repeating its own item's title,
 * which within a single library is what a standalone work looks like. It is the narrower of the
 * two — a name differing here differs in the library as well — so a caller that cannot answer yet
 * offers a subset rather than a wrong set, and nothing it offered is dropped once it can.
 */
export const franchiseOptions = <T>(
  data: readonly T[],
  franchiseOf: (item: T) => string,
  nameOf: (item: T) => string,
  series?: ReadonlySet<string>,
) =>
  categoryOptions(data, (item) => {
    const franchise = franchiseOf(item);
    const holds = series ? series.has(franchise) : !namesTheSameThing(franchise, nameOf(item));
    return holds ? franchise : "";
  }).filter(Boolean);

/** MUI hands a multi-select either an array or a comma-joined string, depending on the event. */
export const toValueArray = (value: string | readonly string[]): string[] =>
  typeof value === "string" ? value.split(",") : [...value];
