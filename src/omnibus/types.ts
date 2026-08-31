import type { ArtworkShape } from "../common/cardArrangement";
import { MOVIE_ARTWORK_SHAPE } from "../movie/CardMediaImage";
import { SHOW_ARTWORK_SHAPE } from "../show/CardMediaImage";
import type { Colour } from "../utils/types";
import { VG_ARTWORK_SHAPE } from "../vg/CardMediaImage";

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
 * The shape a medium's artwork comes in: games are banners, shows and films are posters.
 *
 * The same answer each home tab gives — the values are its own `*_ARTWORK_SHAPE` — because a card
 * on this tab is that tab's card and has to be arranged and reserved the way it is there. Read
 * from the item's medium rather than declared once for the surface, since the whole point of the
 * union is that one row holds all three.
 */
const mediumShapes: Record<Medium, ArtworkShape> = {
  game: VG_ARTWORK_SHAPE,
  show: SHOW_ARTWORK_SHAPE,
  movie: MOVIE_ARTWORK_SHAPE,
};

export const mediumToShape = (medium: Medium): ArtworkShape => mediumShapes[medium];

/**
 * The page-wide measure. An hour is an hour across the three, and an item is a game, a season or
 * a film — the unit each medium is actually logged in, which is why the second measure is not
 * "titles": a show is not comparable to a film, but a season watched is comparable to a film seen.
 */
export type Measure = "Hours" | "Items";
