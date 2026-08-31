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
 * The franchise select's values: every franchise that names something beyond one item's own
 * title. The column repeats a standalone item's name, and erasing those keeps the list to
 * franchises that actually group anything — a real series always has a member whose name differs.
 */
export const franchiseOptions = <T>(
  data: readonly T[],
  franchiseOf: (item: T) => string,
  nameOf: (item: T) => string,
) =>
  categoryOptions(data, (item) => (namesTheSameThing(franchiseOf(item), nameOf(item)) ? "" : franchiseOf(item))).filter(
    Boolean,
  );

/** MUI hands a multi-select either an array or a comma-joined string, depending on the event. */
export const toValueArray = (value: string | readonly string[]): string[] =>
  typeof value === "string" ? value.split(",") : [...value];
