/**
 * What the palette can rank: a thing with a name, some second-rank text, and a size to break ties
 * on. Declared here in the shared layer so the ranker knows nothing about what a name names; the
 * Omnibus shapes its franchises and works into this and reads its own fields back off the result.
 */
export interface Searchable {
  name: string;
  /** Text a hit on which ranks below a hit on the name: an author, a director, a network. */
  secondary: readonly string[];
  /** Larger first among hits of one rank — a franchise's entries, a work's hours. */
  size: number;
}

/** A ranked entry, with the run of its raw name the query matched where the name is what matched. */
export interface Hit<T> {
  entry: T;
  matched?: [start: number, end: number];
}

/**
 * One character of text as it is compared: lowercased, its accent dropped, punctuation a space.
 *
 * A precomposed letter decomposes to its base letter and a combining mark, and only the base is
 * kept, so "é" folds to "e"; the rare letter whose lowercase is two characters keeps its first.
 */
const foldChar = (char: string): string => {
  const base = char.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
  const first = base.charAt(0) || " ";
  return /[\p{L}\p{N}]/u.test(first) ? first : " ";
};

/**
 * Text as it is compared, with the way back to the text as written.
 *
 * Every run of characters that fold to a space — punctuation, spaces, the two together in ": " —
 * becomes one space, so a phrase typed with one space between its words is found across a colon
 * or a hyphen as readily as across a space. `raw[i]` is the code-unit offset in the original of
 * the folded character at `i`, which is what lets a match found in the folded text be underlined
 * on the name as written whatever was collapsed or how many code units a character took.
 */
interface Folded {
  text: string;
  raw: number[];
}

const fold = (text: string): Folded => {
  let folded = "";
  const raw: number[] = [];
  let offset = 0;
  for (const char of text) {
    const next = foldChar(char);
    if (next !== " " || (folded.length > 0 && !folded.endsWith(" "))) {
      folded += next;
      raw.push(offset);
    }
    offset += char.length;
  }
  return { text: folded, raw };
};

/** The folded form of a string on its own, trimmed: a query, or a test's view of the fold. */
export const foldText = (text: string): string => fold(text).text.trim();

/**
 * Folds are held per entry rather than redone per keystroke: the scan over a library is a few
 * thousand strings, and folding one is a normalisation and two Unicode tests per character, which
 * is the whole cost of a query. Entries are rebuilt only with the index, so a weak map keyed on
 * them is emptied exactly when it goes stale.
 */
const folds = new WeakMap<Searchable, { name: Folded; secondary: Folded[] }>();

const foldedOf = (entry: Searchable) => {
  let held = folds.get(entry);
  if (!held) {
    held = { name: fold(entry.name), secondary: entry.secondary.map(fold) };
    folds.set(entry, held);
  }
  return held;
};

/** The run of the raw text a match of `length` folded characters at `index` covers. */
const rawRun = (folded: Folded, index: number, length: number, rawLength: number): [number, number] => [
  folded.raw[index],
  index + length < folded.raw.length ? folded.raw[index + length] : rawLength,
];

/**
 * Where a folded phrase begins in folded text, and whether that start is a word's.
 *
 * A word start is the text's own first character or one after a space, which is what every
 * character that is not a letter or a digit folds to. The first occurrence that starts a word is
 * preferred to an earlier one that does not: "art" in "Martha's Art" is the second.
 */
const find = (text: string, phrase: string): { index: number; wordStart: boolean } | undefined => {
  let index = text.indexOf(phrase);
  if (index < 0) return undefined;
  const first = index;
  while (index >= 0) {
    if (index === 0 || text[index - 1] === " ") return { index, wordStart: true };
    index = text.indexOf(phrase, index + 1);
  }
  return { index: first, wordStart: false };
};

/**
 * How well an entry answers a query, lower being better, with the matched run on the name.
 *
 * Exact on the name, then the phrase at a word's start of the name, then of the second-rank text,
 * then anywhere in the name, then anywhere in the second-rank text; last, every word of the query
 * found somewhere across both, for a reader typing "trek worlds" against "Star Trek: Strange New
 * Worlds". A phrase is preferred to its words because the words alone find too much: "new" and
 * "world" are in half a library.
 */
const rankOf = <T extends Searchable>(
  entry: T,
  phrase: string,
  words: string[],
): (Hit<T> & { rank: number }) | undefined => {
  const { name, secondary } = foldedOf(entry);
  const run = (index: number): [number, number] => rawRun(name, index, phrase.length, entry.name.length);
  if (name.text.trim() === phrase) return { entry, rank: 0, matched: [0, entry.name.length] };

  const inName = find(name.text, phrase);
  if (inName?.wordStart) return { entry, rank: 1, matched: run(inName.index) };

  const inSecondary = secondary.map((text) => find(text.text, phrase)).filter((found) => found !== undefined);
  if (inSecondary.some((found) => found.wordStart)) return { entry, rank: 2 };
  if (inName) return { entry, rank: 3, matched: run(inName.index) };
  if (inSecondary.length > 0) return { entry, rank: 4 };

  if (words.length > 1) {
    const everywhere = [name.text, ...secondary.map((text) => text.text)].join(" ");
    if (words.every((word) => everywhere.includes(word))) return { entry, rank: 5 };
  }
  return undefined;
};

/** Ties within a rank fall to the larger entry, then to the name the reader's locale sorts first. */
const collator = new Intl.Collator();

/**
 * The entries answering a query, best first, cut to `limit` with the count before the cut.
 *
 * Rank first, then size, then name, so two franchises both starting with the phrase stand in size
 * order and a name is the last thing separating them. An empty query answers nothing: the palette
 * has its own idea of what to show before anything is typed. The entries come back as given, so a
 * caller reads its own fields off them and a franchise's raw name — the key every index here is
 * held on — travels through unfolded.
 */
export const rankHits = <T extends Searchable>(
  entries: readonly T[],
  query: string,
  limit: number,
): { hits: Hit<T>[]; total: number } => {
  const phrase = foldText(query);
  if (!phrase) return { hits: [], total: 0 };
  const words = phrase.split(" ");

  const ranked = entries
    .map((entry) => rankOf(entry, phrase, words))
    .filter((hit) => hit !== undefined)
    .toSorted((a, b) => a.rank - b.rank || b.entry.size - a.entry.size || collator.compare(a.entry.name, b.entry.name));

  return {
    hits: ranked.slice(0, limit).map(({ entry, matched }) => (matched ? { entry, matched } : { entry })),
    total: ranked.length,
  };
};
