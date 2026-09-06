import { shapeRatioValues } from "../common/cardArrangement";

/** The row's one height, and the column of words a poster card carries beside its picture. */
export const NOW_HEIGHT = 380;
const NOW_TEXT_WIDTH = 176;

/**
 * The column a portrait cell keeps beside its picture on a phone, the date set down it as a
 * book's spine is.
 *
 * The phone's band is two cells to a row, each half the row less the gap. A banner spans its cell
 * at 16:9 with the date on a line beneath; a poster or a cover stands beside this column at the
 * width the cell leaves it, so the picture's height follows the cell's width and a wider phone
 * gets a taller poster rather than ground beside one. A card that filled the row instead would be
 * as tall as its own artwork — a full-bleed poster at 390px stands 525 — and a cell that held the
 * words beside a poster would leave them under 60px, no width for a word; a date is what stands
 * in a column that narrow, and the artwork carries the name.
 */
export const NOW_SPINE_WIDTH = 36;

/**
 * The band's geometry: one width and one height for every card in the row.
 *
 * The widths are stated rather than left to the artwork's own pixels for two reasons. A flex row
 * asks an item how wide it wants to be before any height is known, and a picture asked that answers
 * with its file's width — a 680px poster then claims 680px and drags the row past 1,000 tall. And a
 * file that is off its declared ratio would stand two cards of one shape at different sizes for a
 * reason no reader can see.
 *
 * One width is the constraint everything else here follows from, and the two shapes meet it in
 * opposite ways:
 *
 * - a poster card is a full-height poster — the height at the poster's own ratio — plus a text
 *   column, and that sum is the width;
 * - the banner card is the same width spent the other way round: its picture spans the card, so the
 *   width fixes the picture's height at 16:9 and the panel gets whatever the row's height leaves;
 * - a cover card is a poster card whose picture is pinned on the height alone, because no two
 *   covers share a ratio: the column beside it is the width the picture left, and moves by the
 *   few pixels one cover differs from another rather than the picture being letterboxed to hide
 *   the difference.
 *
 * That leaves the banner's panel a stated budget rather than a measured one, which is why its card
 * carries no subtitle and why its title cannot wrap: at this width the words have to fit 136px, and
 * a picture that gave way instead would be letterboxed inside a card the row had already sized.
 */
const NOW_POSTER_ART_WIDTH = Math.round(NOW_HEIGHT * shapeRatioValues.portrait);
export const NOW_CARD_WIDTH = NOW_POSTER_ART_WIDTH + NOW_TEXT_WIDTH;
const NOW_BANNER_ART_HEIGHT = Math.round(NOW_CARD_WIDTH / shapeRatioValues.landscape);
export const NOW_BANNER_TEXT_HEIGHT = NOW_HEIGHT - NOW_BANNER_ART_HEIGHT;

/** One width and one height for every card, and the artwork size each shape takes from them. */
export interface NowGeometry {
  cardWidth: number;
  height: number;
  posterArtWidth: number;
  bannerArtHeight: number;
}

export const NOW_GEOMETRY: NowGeometry = {
  cardWidth: NOW_CARD_WIDTH,
  height: NOW_HEIGHT,
  posterArtWidth: NOW_POSTER_ART_WIDTH,
  bannerArtHeight: NOW_BANNER_ART_HEIGHT,
};

/** The band's gap, one spacing unit, stated so the four-way share can count it. */
export const NOW_GAP = 8;

/**
 * The height of the phone's portrait row, solved from the row's measured width: the poster's
 * height at the width its cell leaves beside the spine — 204px at 390, 234 at 430.
 *
 * Stated on both cells rather than left to each picture, because the two are not one ratio: a
 * poster is 680×1000 and a cover whatever its publisher drew, so at one width a cover stands a
 * few dozen pixels taller or shorter than the poster beside it, and two cells on one row at two
 * heights read as a mistake. The poster's height is the one to hold, being the one every poster
 * shares; the cover takes its own width inside it and its spine absorbs the rest, so nothing is
 * cropped and the cover a few percent narrower than 2:3 gives its spine those pixels.
 */
export const nowPortraitHeight = (rowWidth: number): number =>
  Math.round((Math.floor((rowWidth - NOW_GAP) / 2) - NOW_SPINE_WIDTH) / shapeRatioValues.portrait);

/**
 * The narrowest card the four-way share may produce.
 *
 * The column beside a poster is what the floor is really about: at 366 it is 133px, which is as
 * narrow as a date, a two-line title and two tiles read well in, and the column is the card's width
 * less the poster the row's height gives it — so every pixel off the card comes off the words
 * twice over. At 296 the column is 90px and the title has three characters a line.
 *
 * A card under it answers nothing and the band seats two to a row instead (`Now`), which is a real
 * fallback: the pair of the same row is twice this card's width. The pair itself carries no floor,
 * having nothing narrower to fall back to — see `pairNowGeometry`.
 */
const NOW_MIN_CARD_WIDTH = 366;

/**
 * The band solved from the row it is given rather than from the card width above, for the widths
 * where the stated card does not fit the row a whole number of times.
 *
 * The share is the card width, and the rest follows it the way it follows the stated one: the
 * banner's panel keeps its 136px budget exactly, because that budget is what its words were fitted
 * to; its picture at 16:9 across the narrower card is what gives the row its height, and the poster
 * and cover columns take that height and are narrower for it. Solved from the measured row rather
 * than from the container's own numbers, so a change to the theme's container moves the band with
 * it rather than past it.
 *
 * One solver for both shares, since a row shared two ways and a row shared four ways differ only in
 * how many cards and how many gaps come out of it; what each does with a share too narrow to draw
 * is its own.
 */
const shareGeometry = (rowWidth: number, perRow: number): NowGeometry => {
  const cardWidth = Math.floor((rowWidth - (perRow - 1) * NOW_GAP) / perRow);

  const bannerArtHeight = Math.round(cardWidth / shapeRatioValues.landscape);
  const height = bannerArtHeight + NOW_BANNER_TEXT_HEIGHT;
  return { cardWidth, height, posterArtWidth: Math.round(height * shapeRatioValues.portrait), bannerArtHeight };
};

/**
 * The words beside a poster, the narrowest a date, a two-line title and two tiles read well in:
 * the column the four-way share's floor of 366 leaves once its 233px poster is seated, and what the
 * pair keeps whatever its row gives. Stated rather than derived, since the share rounds twice on the
 * way to it; the geometry test holds the two to the same figure.
 */
const NOW_POSTER_COLUMN = 133;

/**
 * The band two cards to a row, which is what every width between the phone and the four-way share
 * draws.
 *
 * **Two to a row is unconditional, and the card is never wider than half the row.** A card wider
 * than its share can only stand one to a row, so refusing the share hands the band four rows of a
 * card the reader never asked to be that big: at a 558px row the stated card is 434 and the band
 * runs 1,544px, against the 590 the same row's pair costs. There is no narrower arrangement above
 * `sm` to fall back to, so the share is taken whatever it comes to and the poster is what gives.
 *
 * The stated card is the ceiling rather than a rung on the way down: from a 876px row the share
 * reaches it and the band is the stated geometry exactly, which is what the `md` cap
 * (`2 * NOW_CARD_WIDTH + NOW_GAP`) holds the four-card row to.
 *
 * The poster is held to the column's remainder wherever the row's height would draw it wider — a
 * 768 tablet's row is 720, the pair 356, and a poster at the row's height would leave its words
 * 128px, so it stands 223 wide and 328 tall in a 336px row with the card's own ground under it.
 * The clamp never crops: the picture keeps its ratio and stands shorter than the row, as a poster
 * beside the phone's hero does. From a 740px row the natural width is inside the column and the
 * clamp does nothing.
 *
 * @see denseNowGeometry
 */
export const pairNowGeometry = (rowWidth: number): NowGeometry => {
  const share = shareGeometry(rowWidth, 2);
  if (share.cardWidth >= NOW_CARD_WIDTH) return NOW_GEOMETRY;

  return { ...share, posterArtWidth: Math.min(share.posterArtWidth, share.cardWidth - NOW_POSTER_COLUMN) };
};

/**
 * The same band with all four media in flight, on one row.
 *
 * Four cards at the width above need 1,760px and the page's widest container gives the row 1,488,
 * so when there are four to seat the band is solved the other way round: the row's measured width
 * shared four ways is the card width, and the row's height follows from it. The banner's panel
 * keeps its 136px budget exactly, because that budget is what its words were fitted to; its
 * picture at 16:9 across the narrower card is what gives the row its height, and the poster and
 * cover columns take that height and are narrower for it.
 *
 * 1,488 is the floor exactly, so the one-row band is the widest container's band and no narrower
 * one's, and a row that cannot give each card that much seats them two and two instead (`Now`).
 * Three cards keep the stated geometry — a row of three at this size would leave a quarter of the
 * band empty for no reason a reader could see. Solved from the measured row rather than from the
 * container's own numbers, so a change to the theme's container moves the band with it rather than
 * past it.
 */
export const denseNowGeometry = (rowWidth: number): NowGeometry | undefined => {
  const share = shareGeometry(rowWidth, 4);
  return share.cardWidth < NOW_MIN_CARD_WIDTH ? undefined : share;
};

/**
 * What every panel in the band gives up so that 136 holds a kicker, a title, a subtitle and a
 * figure.
 *
 * The inset and the tile size are spent on all three cards rather than on the banner alone. The row
 * is read across its figures — the tiles share a baseline and a size — so a tile shrunk on one card
 * and not the other two would trade the band's own consistency for the banner's fit. At 8 above and
 * below, with a 48px compact tile, the banner's kicker, title, subtitle and figure come to the
 * budget exactly, and the poster cards carry the same tiles above the same edge.
 */
export const NOW_PANEL_INSET = 1;
