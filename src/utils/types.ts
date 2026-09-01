export type KeysMatching<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: P };
export type Predicate<T> = (input: T) => boolean;

export type Distinct<T, DistinctName> = T & { __TYPE__: DistinctName };

export type Colour = Distinct<string, "Colour">;

/**
 * The status vocabulary this shared layer knows how to colour. Each domain declares its own
 * `Status` union, which stays assignable to this — the dependency deliberately does not run
 * the other way, so utils/ never imports from a domain folder.
 */
export type ColourableStatus =
  "Abandoned" | "Beat" | "Ended" | "Cancelled" | "Endless" | "Up To Date" | "Playing" | "Watching" | "Next" | "Backlog";

/**
 * **The contract every chart fill in this app is held to**, stated here once and referred to from
 * each of the tables that has to meet it.
 *
 * A fill is drawn on both of the surfaces the app paints on — #ffffff paper in the light scheme,
 * #1d2126 paper in the dark one — and so clears 3:1 against both. A colour chosen against the
 * light card alone washes out on the dark one: `#ffeb3b` is 1.22:1 on white. Meeting the floor on
 * both ends means only lightness is free to move, which is what keeps every table in this app
 * inside one lightness band.
 *
 * The relief, where a value's own identity *is* its brightness or its darkness, is to relax the
 * floor to 2.2:1 on the offending surface alone and keep the full 3:1 on the other. That is only
 * allowed where colour is not carrying the meaning by itself — a labelled wedge, a named legend
 * entry — and the table taking it says which entries do and why. `vg/types.ts`'s franchise brands
 * are the one set that does.
 *
 * `NEUTRAL_FILL` itself is the colour of absence: a state that has not started, a category with no
 * colour of its own, the "Other" bucket a top-N list collects the tail into. One value across all
 * three, so a reader who has learnt that this grey means "nothing to say here" reads it the same
 * on every chart. Black beside coloured fills reads as another hue rather than as absence.
 */
export const NEUTRAL_FILL = "#7d828c" as Colour;

/**
 * Every certificate the sheets record, written the way its own board writes it.
 *
 * Games are recorded as PEGI, which carries the suffix (`16+`); Shows and Movies as BBFC, which
 * writes the bare number (`15`). Both notations are kept as the sheet holds them, because a card's
 * badge should read the way the certificate does.
 *
 * The ten are listed rather than derived by crossing the ages with an optional suffix: the two
 * boards do not issue the same set — PEGI has no 15 and BBFC no 16 — so a cross product admits
 * `15+` and `16`, which is the shape the likeliest typo takes and would pass validation.
 */
const AGE_RATINGS = ["3", "7", "12", "15", "18", "3+", "7+", "12+", "16+", "18+"] as const;
export type AgeRating = (typeof AGE_RATINGS)[number];

/**
 * Whether a sheet cell holds an age rating, so a converter can reject a bad one where it still
 * knows which row it came from. Without this the first sign of trouble is `ageRatingToColour`
 * throwing from inside a render, naming a value but not the show or film that carried it.
 */
export const isAgeRating = (value: string): value is AgeRating => (AGE_RATINGS as readonly string[]).includes(value);

/**
 * The tier a rating names, which is the unit anything grouping across the two boards has to use.
 *
 * PEGI marks the age with a suffix and calls the middle tier 16; BBFC writes the bare number and
 * calls that same tier 15. So a grouping over the raw cell splits every tier in two by notation
 * alone — a PEGI 12+ game and a BBFC 12 film on separate shelves saying the same thing, and the
 * two halves of one tier drawn in the same colour beside each other. The band is keyed on the age
 * rather than on the notation, and is what the colour is looked up by, so the two cannot disagree
 * about which ratings are one thing.
 *
 * A band is named by its bare number, and by both numbers where the boards disagree on it: naming
 * the 15/16 tier after one board alone would put a PEGI 16 game under a heading no sheet of this
 * library writes for it. Only a grouping reads this — a card states the certificate its own row
 * carries, which is the value the reader would find in the sheet.
 */
const ratingBands: Record<number, string> = { 3: "3", 7: "7", 12: "12", 15: "15/16", 16: "15/16", 18: "18" };

export const ageRatingBand = (rating: AgeRating): string => {
  const band = ratingBands[parseInt(rating, 10)];
  // Throws rather than falling back, which is what catches a typo in the spreadsheet.
  if (!band) throw new Error("Unknown rating: " + rating);
  return band;
};

/**
 * Traffic-light lightness: two greens for what a child can watch unaccompanied, two ambers for
 * the middle, red for adults only. The pairs separate by lightness within a hue, which is what
 * lets 3 and 7 read as one band while still being told apart side by side.
 *
 * Keyed by band, so the colour tracks the age and not the notation: a PEGI 12+ game and a BBFC 12
 * film carry the same swatch — the two scales are never drawn on one chart, and a reader moving
 * between tabs would otherwise have to learn the same ramp twice.
 */
const bandColours: Record<string, Colour> = {
  "3": "#88c32f" as Colour,
  "7": "#6d9c26" as Colour,
  "12": "#c27400" as Colour,
  "15/16": "rgb(242,144,0)" as Colour,
  "18": "#d60015" as Colour,
};

/** The colour of a band, for a surface that has already grouped and holds the band and not a row. */
export const ageBandToColour = (band: string): Colour => {
  const colour = bandColours[band];
  if (!colour) throw new Error("Unknown rating band: " + band);
  return colour;
};

export const ageRatingToColour = (rating: AgeRating): Colour => ageBandToColour(ageRatingBand(rating));

/**
 * Hue says how a thing ended; lightness says whether it is still moving.
 *
 * Cyan is in progress, blue is open-ended, green finished well, amber was stopped by someone
 * else, rose was stopped by choice — and the five step down in lightness in that order, so a
 * chart squinted at answers "how much of this is still alive?" before a single hue is read.
 * Active states are the lightest and most vivid; the finished green sits a chroma step below the
 * other terminal states, because it is the majority of every status chart and a majority at full
 * saturation is a wall, while Cancelled and Abandoned are the exceptions worth noticing.
 *
 * Next and Backlog have not started, so they take the same neutral grey the charts' "Other"
 * buckets wear: an inert state wants an inert colour, and black beside coloured fills reads as a
 * sixth hue rather than as absence.
 *
 * Every value meets the fill contract above.
 */
export const statusToColour = ({ status }: { status: ColourableStatus }) => {
  switch (status) {
    case "Abandoned":
      return "#d10074" as Colour;
    case "Beat":
    case "Ended":
      return "#338c5f" as Colour;
    case "Cancelled":
      return "#9b6200" as Colour;
    case "Endless":
    case "Up To Date":
      return "#2f75ff" as Colour;
    case "Playing":
    case "Watching":
      return "#00a5a6" as Colour;
    case "Next":
    case "Backlog":
      return NEUTRAL_FILL;
  }
};

/**
 * The genre vocabulary Shows and Movies share. It lives here rather than in either domain for the
 * same reason `ageRatingToColour` does: the two record overlapping genre sets in one spreadsheet,
 * and one swatch has to mean one thing across both tabs.
 *
 * Each hue is chosen to *represent* its genre. Action and Adventure keep the hues
 * `vg/types.ts` paints those same genre names with, so the two genres all three tabs record
 * read as one thing everywhere; the other hexes also reappear in vg's table but under
 * *different* genres — deliberate palette recycling, safe because no chart ever shows the two
 * vocabularies side by side, and not a correspondence to preserve. Every value meets the fill
 * contract above.
 *
 * The lookup falls to `NEUTRAL_FILL` rather than throwing: the genre column is open-ended, and a
 * new genre appearing in the sheet should render as "no colour yet", not take the tab down.
 */
const genreColours: Record<string, Colour> = {
  Action: "#fe4c00" as Colour,
  Adventure: "#13ac00" as Colour,
  Comedy: "#ae9200" as Colour,
  Drama: "#0072c5" as Colour,
  Fantasy: "#7543ff" as Colour,
  Horror: "#d5005e" as Colour,
  Mystery: "#008268" as Colour,
  Romance: "#ff1da7" as Colour,
  "Sci-Fi": "#00a4b1" as Colour,
  Thriller: "#667100" as Colour,
  "True Story": "#a85500" as Colour,
};

export const genreToColour = (genre: string): Colour => genreColours[genre] ?? NEUTRAL_FILL;

/**
 * Release decades as an ordered ramp: one bronze hue with only lightness stepping, oldest
 * lightest, because a decade is ordered data and a categorical hue set would deny that. Seven
 * steps is what the fill contract leaves room for between the two papers, so everything before
 * 1970 shares one bucket — the sheets hold a handful of films there and no games at all.
 */
const decadeColours: Record<string, Colour> = {
  "Pre-1970": "#c08938" as Colour,
  "1970s": "#b68335" as Colour,
  "1980s": "#ad7c32" as Colour,
  "1990s": "#a3742f" as Colour,
  "2000s": "#996d2c" as Colour,
  "2010s": "#91672a" as Colour,
  "2020s": "#8e6529" as Colour,
};

export const releaseDecade = (year: number): string => (year < 1970 ? "Pre-1970" : `${Math.floor(year / 10) * 10}s`);

export const decadeToColour = (decade: string): Colour => decadeColours[decade] ?? NEUTRAL_FILL;
