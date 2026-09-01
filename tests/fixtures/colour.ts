/**
 * Colour oracles for the tests, kept independent of `src/`.
 *
 * `utils/colourUtils` has its own linearisation, and asserting it against itself would pass however
 * wrong it was — so this is a second implementation of the WCAG formulae rather than an import.
 * `fillContract.test.ts` holds every table to 3:1 through it, which is the assertion the whole
 * colour system rests on: computing it from the code under test would let a bug in that code make
 * the contract pass.
 */

const channel = (hex: string, shift: number) => {
  const c = ((parseInt(hex.replace("#", ""), 16) >> shift) & 0xff) / 255;
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
};

export const relativeLuminance = (hex: string) =>
  0.2126 * channel(hex, 16) + 0.7152 * channel(hex, 8) + 0.0722 * channel(hex, 0);

export const contrast = (a: string, b: string) => {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** The two surfaces the app paints a fill on, from the light and dark colour schemes. */
export const PAPERS = { light: "#ffffff", dark: "#1d2126" };

/**
 * Every genre the Games, Shows and Movies sheets record between them. Games adds no name of its
 * own — its ten are a subset of the other two's.
 *
 * Shared because two files test different properties over the same vocabulary, and a sheet gaining
 * a genre has to reach both: the shared ramp has to answer for it, and whatever it answers has to
 * clear the fill contract on the paper it is drawn on.
 */
export const liveGenres = [
  "Action",
  "Adventure",
  "Comedy",
  "Drama",
  "Fantasy",
  "Horror",
  "Mystery",
  "Romance",
  "Sci-Fi",
  "Thriller",
  "True Story",
];
