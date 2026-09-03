/**
 * Whether two titles name the same thing, ignoring a leading article and case.
 *
 * Both sheets record a franchise for every row and fall back to the title itself where there is
 * no wider series, so a card has to decide whether the franchise is worth a line of its own. Exact
 * equality is not enough: the two are typed independently and drift by an article — 43 films and
 * 36 shows pair a `The Chronicles of Narnia…` title with a `Chronicles of Narnia…` franchise, and
 * each would otherwise get a row repeating its own name back at the reader.
 *
 * Only equality is treated as the same thing. A franchise that is a *prefix* of the title is the
 * case worth keeping — `Harry Potter` under `Harry Potter and the Philosopher's Stone`, or
 * `Pirates of the Caribbean` under any of its four — so the comparison deliberately stops short
 * of matching those.
 */
export const namesTheSameThing = (a: string, b: string) => normaliseTitle(a) === normaliseTitle(b);

// Trimmed before the article is stripped, or a cell with a leading space keeps its "The".
const normaliseTitle = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/^the\s+/, "");

/**
 * A sheet cell holding a comma-separated list, as that list.
 *
 * Empty parts are dropped, so a blank cell is an empty array rather than one holding an empty
 * string — every reader counts or renders these directly, and `[""]` shows up as a blank entry and
 * as a value of its own in any tally. A cell the row ended before arrives as `undefined`.
 *
 * The separator is fixed because the sheets write these lists both ways, `a, b` and `a,b`, so the
 * space cannot be part of it and each part is trimmed instead.
 */
export const splitCell = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

/**
 * A model key as a phrase, in sentence case: `startDate` reads "Start date", `name` reads "Name".
 *
 * The sunburst's ring selects offer the fields themselves — the grouping is the model's own keys —
 * so a menu left to the raw values reads `startDate` beside `franchise`, in the theme's
 * `capitalize`, which puts a capital on each word and none on a camelCase run. Sentence case is
 * what a label is: one capital, at the front.
 *
 * The split is on the camelCase boundary alone, so a key that is an acronym comes back as a word —
 * every key this is asked of is a field name typed as one.
 */
export const keyLabel = (key: string): string => {
  const words = key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
