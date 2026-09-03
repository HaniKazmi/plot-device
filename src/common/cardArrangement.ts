import { createContext, useContext } from "react";

/**
 * The shape a card's artwork comes in. Each domain names its own once; a surface mixing media reads
 * it off the item.
 *
 * A cover is portrait too, and is arranged like one. It is a shape of its own because its ratio is
 * only approximately known: posters are authored to one pixel size, where book covers come from
 * their publishers at roughly 2:3 and vary by a few percent each. A layout that pins a poster's
 * declared ratio firmly therefore lets a cover take its own — see `shapeIsExact`.
 */
export type ArtworkShape = "landscape" | "portrait" | "cover";

/**
 * Where a card's words sit against its artwork: underneath it, or in a column beside it.
 *
 * Shape decides this wherever a card is one of many at a size it did not choose — a strip, a grid, a
 * band. The two shapes fail in opposite directions under a single arrangement: a banner is four
 * times as wide as it is tall, so words beside it get a sliver of a column, while a poster is half
 * as wide as it is tall, so the strip beneath it is a hundred pixels across and clamps every title
 * to three characters. Arranging by shape gives each of them the axis it has room on, and a mixed
 * row then varies gently in width at one height.
 *
 * A caller that pins its own artwork size names the arrangement instead, because the reasoning above
 * is about a card whose width is imposed on it. The hero is the one such caller: it fixes the
 * artwork's height so a banner cannot stand at nine sixteenths of the page, and at that height a
 * banner is 533px against a card of well over a thousand — the width beside it is the only place the
 * panel can go without leaving two thirds of the card empty.
 */
type CardArrangement = "stacked" | "beside";

const shapeArrangements: Record<ArtworkShape, CardArrangement> = {
  landscape: "stacked",
  portrait: "beside",
  cover: "beside",
};

export const shapeToArrangement = (shape: ArtworkShape): CardArrangement => shapeArrangements[shape];

/**
 * The shape every artwork of a kind is drawn at: banners 16:9, posters 680×1000 — the exact pixel
 * size the poster buckets hold, so a canonical file fills its box with nothing left over — and
 * covers 2:3, which is what a publisher's cover is nearest to.
 *
 * The ratio a layout measures is this one and never the file's own. Artwork is authored to it, but
 * an individual image can be off by a few pixels, and a band that took each picture's measured ratio
 * would stand two cards of one shape at different widths for a reason no reader can see — a mistake in
 * one file becoming a visible difference in the page. Sizing from the declared ratio makes every
 * poster card identical and leaves an off-size file to be letterboxed rather than to move the layout.
 *
 * A cover is the exception, and `shapeIsExact` is what says so: no two covers share a ratio, so a
 * layout that held every cover to 2:3 would letterbox every one of them by a few percent. A surface
 * that pins the declared ratio for posters lets a cover take the ratio its file holds instead —
 * standing at its real width against a fixed height — and absorbs the difference in whatever sits
 * beside it. Nothing is authored to a cover's ratio, so there is no canonical file to hold it to.
 */
export const shapeRatioValues: Record<ArtworkShape, number> = {
  landscape: 16 / 9,
  portrait: 680 / 1000,
  cover: 2 / 3,
};

const shapeRatios: Record<ArtworkShape, string> = {
  landscape: "16 / 9",
  portrait: "680 / 1000",
  cover: "2 / 3",
};

export const shapeToRatio = (shape: ArtworkShape): string => shapeRatios[shape];

/**
 * Whether every artwork of this shape is authored to `shapeRatioValues` exactly, and so can be held
 * to it. False only for covers, whose ratio is a reservation and never a size.
 */
const shapeExact: Record<ArtworkShape, boolean> = {
  landscape: true,
  portrait: true,
  cover: false,
};

export const shapeIsExact = (shape: ArtworkShape): boolean => shapeExact[shape];

/**
 * The height a card holds for artwork it has not loaded yet.
 *
 * A lazily loaded image contributes nothing of its own, so a wall or a strip of them stands at a
 * fraction of its real size and every offset measured in it is short by the artwork below — and
 * scrolling into that artwork is what makes it load, so the page grows under the reader. The
 * leading `auto` is what keeps this a reservation rather than a crop: the artwork's own shape wins
 * the moment it is known, and this stands in only while there is none.
 */
const shapeAspects: Record<ArtworkShape, string> = {
  landscape: `auto ${shapeRatios.landscape}`,
  portrait: `auto ${shapeRatios.portrait}`,
  cover: `auto ${shapeRatios.cover}`,
};

export const shapeToAspect = (shape: ArtworkShape): string => shapeAspects[shape];

/**
 * The arrangement published by the card a panel is rendered inside.
 *
 * The panel is the caller's node rather than the shell's, so the arrangement cannot be handed down
 * as a prop without every one of the three domains repeating the decision at each of its card
 * sites. Read from the card instead, exactly as the sampled accent is, and the two halves of one
 * card cannot come to disagree about which way round they are.
 *
 * `stacked` is what a panel outside any card falls to — the arrangement that needs nothing of its
 * container.
 */
const CardArrangementContext = createContext<CardArrangement>("stacked");

export const CardArrangementProvider = CardArrangementContext.Provider;

export const useCardArrangement = (): CardArrangement => useContext(CardArrangementContext);

/**
 * How tall a poster stands beside the words, which is what its width then follows from.
 *
 * Pinned on the height rather than the width, for the reason the hero pins the same axis: a picture
 * asked how wide it wants to be answers with its file's own pixels, and a hover card has no outside
 * width to shrink that against the way a card in a grid does. A height plus the declared ratio gives
 * the card the same size before its image has loaded as after, which is what the popper needs — it
 * positions the card once, at the moment it opens.
 */
const HOVER_CARD_ASIDE_ARTWORK_HEIGHT = 348;

/**
 * The size a hover card's artwork is held at, by the shape it is drawn in.
 *
 * The shape is held firmly rather than as the `auto` reservation the walls use, because a tooltip
 * is positioned once, against the card as it stands the moment it opens. An image that has not
 * loaded has no size of its own, so the card opens short, the picture then adds a few hundred
 * pixels to it, and the popper never reflows — a card seen for the first time lands off the screen
 * where the same card seen again does not. Reserved at the ratio the artwork is drawn at, the card
 * is the same size before and after.
 *
 * A poster stands beside the words and so is pinned on its height; a banner spans the card above
 * them and takes its width. A cover stands like a poster but holds its ratio only until its file
 * has loaded: the reservation keeps the card the right size to within a few percent, and the
 * picture's real width then wins, so the card grows or shrinks by the few pixels a cover is off
 * 2:3 rather than letterboxing them.
 */
export const hoverCardArtworkSx = (shape: ArtworkShape) =>
  shapeToArrangement(shape) === "beside"
    ? {
        aspectRatio: shapeIsExact(shape) ? shapeToRatio(shape) : shapeToAspect(shape),
        height: HOVER_CARD_ASIDE_ARTWORK_HEIGHT,
        width: "auto",
        flexShrink: 0,
      }
    : { aspectRatio: shapeToRatio("landscape"), width: "100%", display: "block" };
