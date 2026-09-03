import type { ArtworkShape } from "../common/cardArrangement";
import { fill, pick, type Colour, type Fill, type Scheme } from "../utils/types";

/**
 * The four things this tab counts. Singular and lower case because it is a discriminant on a
 * record rather than a label — `mediumToLabel` is what a chart legend reads.
 */
export type Medium = "game" | "show" | "movie" | "book";

/** In the order the page says them, which is the order the tabs themselves run in. */
export const media: readonly Medium[] = ["game", "show", "movie", "book"];

/**
 * The one vocabulary this tab teaches, and the only colour on the page carrying meaning.
 *
 * Each value meets the fill contract on `NEUTRAL_FILL`, half by half, and no medium reads as
 * louder than the others. The hues are the home tabs' own — arcade magenta for Games, screen-glow
 * teal for Shows, cinema red for Movies, page gold for Books — so a reader arriving from a tab
 * finds the colour it was already wearing, and they cannot be chosen independently of `tabs.ts`
 * without the two drifting. The closest pair is 16.8 dE, which is above what two fills need to be
 * told apart; the legend beside every bar and the medium name on every strip carry the rest.
 */
const mediumColours: Record<Medium, Fill> = {
  game: fill("#bc00b6", "#ea00e3"),
  show: fill("#007f9f", "#00afdb"),
  movie: fill("#c93700", "#f34400"),
  book: fill("#857200", "#c6ac00"),
};

export const mediumToColour = (medium: Medium, scheme: Scheme): Colour => pick(mediumColours[medium], scheme);

/** How a medium reads in a legend, a header or a chip — the home tab's own name for itself. */
const mediumLabels: Record<Medium, string> = {
  game: "Games",
  show: "Shows",
  movie: "Movies",
  book: "Books",
};

export const mediumToLabel = (medium: Medium): string => mediumLabels[medium];

/**
 * The same names in the singular, for a label naming one item rather than a group.
 *
 * A legend, a header and a filter toggle all stand for a set and read in the plural; the band under
 * a single picture stands for that picture. Written out rather than trimmed from the plural, since
 * a vocabulary that gains a medium whose plural is not its name plus an "s" would otherwise be
 * wrong in one place and right in the other.
 */
const mediumNames: Record<Medium, string> = {
  game: "Game",
  show: "Show",
  movie: "Movie",
  book: "Book",
};

export const mediumToName = (medium: Medium): string => mediumNames[medium];

/**
 * The shape a medium's artwork comes in: the Games sheet holds banners, the Shows and Movies sheets
 * hold posters, and the Books sheet holds covers — portrait like a poster, but at roughly 2:3 and
 * varying by a few percent from book to book, which is what makes it a shape of its own rather
 * than the poster's (see `cardArrangement`).
 *
 * Only this tab asks. A home tab's artwork is all one shape, so its layout is drawn for that shape
 * and the question never comes up; here a single row holds all four, which is why every card on
 * the page reserves and arranges itself from the item's own medium.
 */
const mediumShapes: Record<Medium, ArtworkShape> = {
  game: "landscape",
  show: "portrait",
  movie: "portrait",
  book: "cover",
};

export const mediumToShape = (medium: Medium): ArtworkShape => mediumShapes[medium];

/**
 * The page-wide measure. An hour is an hour across the four, and an item is a game, a season, a
 * film or a book — the unit each medium is actually logged in, which is why the second measure is
 * not "titles": a show is not comparable to a film, but a season watched is comparable to a film
 * seen.
 */
export type Measure = "Hours" | "Items";
