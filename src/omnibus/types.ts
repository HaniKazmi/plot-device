import type { ArtworkShape } from "../common/cardArrangement";
import type { Colour } from "../utils/types";

/**
 * The three things this tab counts. Singular and lower case because it is a discriminant on a
 * record rather than a label — `mediumToLabel` is what a chart legend reads.
 */
export type Medium = "game" | "show" | "movie";

/** In the order the page says them, which is the order the tabs themselves run in. */
export const media: readonly Medium[] = ["game", "show", "movie"];

/**
 * The one vocabulary this tab teaches, and the only colour on the page carrying meaning.
 *
 * Each value meets the fill contract on `NEUTRAL_FILL`: 3:1 against both the #ffffff and #1d2126
 * papers, in one lightness band so no medium reads as louder than the others. The hues are the
 * home tabs' own accents pulled into that band — a games indigo, a shows red, a movies amber — so
 * a reader arriving from a tab finds the colour it was already wearing. Red and amber are 60°
 * apart at equal lightness, which is the pair a red-blind reader has least of; the legend beside
 * every bar and the medium name on every strip are what carry that pair.
 */
const mediumColours: Record<Medium, Colour> = {
  game: "#5b6cc9" as Colour,
  show: "#bd3f46" as Colour,
  movie: "#bd8900" as Colour,
};

export const mediumToColour = (medium: Medium): Colour => mediumColours[medium];

/** How a medium reads in a legend, a header or a chip — the home tab's own name for itself. */
const mediumLabels: Record<Medium, string> = {
  game: "Games",
  show: "Shows",
  movie: "Movies",
};

export const mediumToLabel = (medium: Medium): string => mediumLabels[medium];

/**
 * The shape a medium's artwork comes in: the Games sheet holds banners, the Shows and Movies sheets
 * hold posters.
 *
 * Only this tab asks. A home tab's artwork is all one shape, so its layout is drawn for that shape
 * and the question never comes up; here a single row holds all three, which is why every card on
 * the page reserves and arranges itself from the item's own medium.
 */
const mediumShapes: Record<Medium, ArtworkShape> = {
  game: "landscape",
  show: "portrait",
  movie: "portrait",
};

export const mediumToShape = (medium: Medium): ArtworkShape => mediumShapes[medium];

/**
 * The page-wide measure. An hour is an hour across the three, and an item is a game, a season or
 * a film — the unit each medium is actually logged in, which is why the second measure is not
 * "titles": a show is not comparable to a film, but a season watched is comparable to a film seen.
 */
export type Measure = "Hours" | "Items";
