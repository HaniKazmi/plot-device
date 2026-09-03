import type { ArtworkShape } from "../common/cardArrangement";
import { MEDIA, type Medium } from "../utils/types";

/**
 * The medium vocabulary is the shared layer's — every tab's card strip draws all four — and this
 * tab reads it from there. Re-exported under the names this folder speaks so its consumers name
 * one module for everything the union is made of.
 */
export { mediumToColour, mediumToLabel, mediumToName, type Medium } from "../utils/types";

/** In the order the page says them, which is the order the tabs themselves run in. */
export const media: readonly Medium[] = MEDIA;

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
