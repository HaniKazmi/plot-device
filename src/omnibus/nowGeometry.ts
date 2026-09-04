import { shapeRatioValues } from "../common/cardArrangement";

/** The row's one height, and the column of words a poster card carries beside its picture. */
export const NOW_HEIGHT = 380;
const NOW_TEXT_WIDTH = 176;

/**
 * The same band on a phone, where each medium is a row rather than a card.
 *
 * A card that fills the width is a card as tall as its own artwork: at 390px a full-bleed poster
 * stands 525px, and four of them put the band's last figure two and a half screens below the
 * first — a page that opens on what is in flight instead opens on one picture. A row states its
 * height and every shape takes its own width from it, uncropped: a banner 142px, a poster 54 and a
 * cover 53, the difference between them a second cue to the medium after the colour.
 *
 * 80 is what two figures stacked at the row's end come to, and four of those rows is still one
 * screen. What pays for it is the title, which the row does not write: the artwork carries the
 * name, and the row keeps it as the picture's alt text and its own label.
 */
export const NOW_ROW_HEIGHT = 80;

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
 * The narrowest card a share may produce.
 *
 * The column beside a poster is what the floor is really about: at 366 it is 133px, which is as
 * narrow as a date, a two-line title and two tiles read well in, and the column is the card's width
 * less the poster the row's height gives it — so every pixel off the card comes off the words
 * twice over. At 296, the two-way share of a 600px row, the column is 90px and the title has three
 * characters a line.
 *
 * One figure for both shares, because the reading it protects is the same one: a card narrower
 * than this is a card whose words cannot be read, however many of it the row was trying to seat.
 * A share under it answers nothing and the band falls back (`Now`) — to two cards a row where four
 * were being solved for, and to the stated card, one a row, where two were.
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
 */
const shareGeometry = (rowWidth: number, perRow: number): NowGeometry | undefined => {
  const cardWidth = Math.floor((rowWidth - (perRow - 1) * NOW_GAP) / perRow);
  if (cardWidth < NOW_MIN_CARD_WIDTH) return undefined;

  const bannerArtHeight = Math.round(cardWidth / shapeRatioValues.landscape);
  const height = bannerArtHeight + NOW_BANNER_TEXT_HEIGHT;
  return { cardWidth, height, posterArtWidth: Math.round(height * shapeRatioValues.portrait), bannerArtHeight };
};

/**
 * The band two cards to a row, which is what a wide tablet draws.
 *
 * The stated card is 434, so two of them fit no page between the phone and `md` and one leaves
 * half the band empty. Sharing the row in two is the same answer the four-way share gives a wide
 * desktop, and it is bounded the same way: two of a 740px row are 366 each, exactly the floor, and
 * a narrower row gives back nothing. At 800 the page gives the row 752 and the pair is 372.
 *
 * Under 740 the band stands the cards at their stated width instead, and they wrap one to a row,
 * two of those not fitting either. That is what a 768 tablet gets — its row is 720, where the pair
 * would be 356 and the words beside a poster 128px — and what the reader gets everywhere between
 * the phone's rows and the width the pair opens at: a column of full-size cards, each the size the
 * band was drawn at, rather than a row of two whose words are narrower than they read in.
 *
 * @see denseNowGeometry
 */
export const pairNowGeometry = (rowWidth: number): NowGeometry | undefined => shareGeometry(rowWidth, 2);

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
export const denseNowGeometry = (rowWidth: number): NowGeometry | undefined => shareGeometry(rowWidth, 4);

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
