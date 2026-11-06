/**
 * The widths a page's hero changes at that are the hero's own rather than the screen's, as
 * container queries.
 *
 * Two boxes are sized containers: the hero itself, which decides whether a banner can stand beside
 * its words, and the panel of words, which decides what has to fit it — whether the franchise
 * strip has room for its beads, and the title for a third line. Everything a reader compares
 * from tab to tab, the title's size and the figures as lines or tiles, follows the screen instead,
 * since a banner and a poster on one screen leave their words 222px and 530px.
 *
 * Kept apart from `Hero.tsx` and `Card.tsx` because both read them: the hero lays the artwork out
 * and the panel draws its words, and a constant in either would close an import cycle.
 */

/** The hero's own box. */
export const HERO_CONTAINER = "hero";

/** The panel of words beside or under the artwork. */
export const HERO_PANEL_CONTAINER = "hero-panel";

/**
 * The hero width from which a banner stands beside its words rather than over them: the banner at
 * the tablet's 280px is 498px wide, which leaves a 700px hero a 202px panel, a little wider than
 * the 154px a phone's poster leaves its words and drawn the same way. Under it the banner spans
 * the hero and the words stand beneath, as on a phone, where at 600px a banner beside its words
 * leaves them 90px and a title three characters a line.
 */
const BANNER_BESIDE_WIDTH = 700;

/** Where a banner stands beside its words. */
export const HERO_BESIDE = `@container ${HERO_CONTAINER} (min-width: ${BANNER_BESIDE_WIDTH}px)`;

/**
 * A panel wide enough for the franchise strip's beads.
 *
 * Measured inside the panel's inset. Narrower is a phone's column beside a poster (130–170px), a
 * tablet's beside a banner (198px) and a banner's on a page just past `md` (287px), where the
 * strip is the franchise's name alone. A panel under a banner is never a container at all
 * (`HERO_BESIDE`), so it draws narrow at any width: its height is not the picture's, and a strip
 * under a phone's banner is a second screen of hero.
 *
 * Only what has to fit the panel follows its width. The title's size and whether the figures are
 * lines or tiles follow the screen (`HeroPanel`), so the heroes on one screen state
 * both one way whatever room each picture leaves its words.
 */
export const PANEL_MEDIUM = `@container ${HERO_PANEL_CONTAINER} (min-width: 360px)`;
