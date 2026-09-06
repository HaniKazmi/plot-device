import { formatDate } from "../common/date";
import { shapeRatioValues } from "../common/cardArrangement";
import type { CardRowSizing } from "../common/Stats";
import type { ShelfItem } from "./galleryData";

/**
 * How a card is sized in a mixed-media list — Recently Finished, the gallery's drill-downs, a
 * franchise view — which is the Now band's rule at strip scale: every card in a row one size, the
 * picture sized by its shape, and the words taking what it leaves.
 *
 * A grid gives every card one width and a row is then as tall as its tallest card: a artwork's
 * footer stands under a picture the width of the cell, a poster's words sit beside a picture half
 * that wide, and the two come out a dozen pixels apart, the shorter carrying that much of its own
 * ground. Sizing every card the same and letting the words give way is what leaves every picture
 * whole and every row flush.
 *
 * The narrowest a card may be is a poster tall enough to read as one — 206px, a third of the
 * height a hero draws it at — beside a column wide enough for a date and a two-line title. The row
 * then shares its width between as many of those as fit (`rowCardSize`), and the picture is the
 * artwork's at that width, 16:9 across it, which cannot give; the list adds the medium band over
 * it, the footer under it and the border round it, all of them its own. A poster inside that
 * height stands a little taller than the one the minimum was solved from, and its column takes
 * the rest — that column is exactly what the words absorb, whichever way the row's width falls.
 */
const POSTER_PICTURE_HEIGHT = 206;
const POSTER_TEXT_WIDTH = 140;

export const MIXED_CARD_SIZING: CardRowSizing = {
  minWidth: Math.round(POSTER_PICTURE_HEIGHT * shapeRatioValues.portrait) + POSTER_TEXT_WIDTH,
  pictureHeightFor: (width) => Math.round(width / shapeRatioValues.landscape),
};

/**
 * The strip under a card standing for a whole work — a show collapsed to one card however many
 * seasons it ran, as the gallery's drill-downs and the franchise view list them.
 *
 * The name and not `omniTitle`: the representative behind the card is one season, and a card for
 * the whole show captioned "S2" claims to be about that season. The date is the work's own close,
 * which `galleryWorks` states as the latest of its entries' and withholds while any is still
 * going: a show with a season running is not finished whichever season the picture came from.
 */
export const workLabels = (item: ShelfItem): string[][] => [
  [item.closeDate ? formatDate(item.closeDate) : "In progress"],
  [item.name],
];
