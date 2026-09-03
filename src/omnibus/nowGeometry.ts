import { shapeRatioValues } from "../common/cardArrangement";

/** The row's one height, and the column of words a poster card carries beside its picture. */
export const NOW_HEIGHT = 380;
const NOW_TEXT_WIDTH = 176;

/**
 * The same band on a phone, where the three cards are a column rather than a row.
 *
 * A card that fills the width is a card as tall as its own artwork: at 375px a full-bleed poster
 * stands 550px, and three of them put the band's last figure nearly two screens below the first —
 * a page that opens on what is in flight instead opens on one picture. Seating the words beside the
 * artwork at a height the caller picks is what the arrangement rule is for (§6); it is applied by
 * shape at every other width and by shape *and* width here, because the constraint a phone adds is
 * the one the rule cannot see.
 *
 * A banner keeps its words underneath at every width. Beside a 16:9 picture at this height there
 * are nineteen pixels of column left, and the arrangement exists to give each shape the axis it has
 * room on.
 */
export const NOW_HEIGHT_XS = 200;
export const NOW_POSTER_ART_WIDTH_XS = Math.round(NOW_HEIGHT_XS * shapeRatioValues.portrait);

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
 * The same band with all four media in flight, on one row.
 *
 * Four cards at the width above need 1,760px and the page's widest container gives the row 1,488,
 * so when there are four to seat the band is solved the other way round: the row's measured width
 * shared four ways is the card width, and the row's height follows from it. The banner's panel
 * keeps its 136px budget exactly, because that budget is what its words were fitted to; its
 * picture at 16:9 across the narrower card is what gives the row its height, and the poster and
 * cover columns take that height and are narrower for it.
 *
 * The share has a floor, 366. The column beside a poster is 133px there, which is as narrow as a
 * date, a two-line title and two tiles read well in, and a row that cannot give each card that
 * much seats them two and two instead (`Now`). The widest container gives exactly that, so the
 * one-row band is that container's band and no narrower one's. Three cards keep the geometry
 * above — a row of three at this size would leave a quarter of the band empty for no reason a
 * reader could see. Solved from the measured row rather than from the container's own numbers,
 * so a change to the theme's container moves the band with it rather than past it.
 */
const NOW_DENSE_MIN_CARD_WIDTH = 366;

export const denseNowGeometry = (rowWidth: number): NowGeometry | undefined => {
  const cardWidth = Math.floor((rowWidth - 3 * NOW_GAP) / 4);
  if (cardWidth < NOW_DENSE_MIN_CARD_WIDTH) return undefined;
  const bannerArtHeight = Math.round(cardWidth / shapeRatioValues.landscape);
  const height = bannerArtHeight + NOW_BANNER_TEXT_HEIGHT;
  return { cardWidth, height, posterArtWidth: Math.round(height * shapeRatioValues.portrait), bannerArtHeight };
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
