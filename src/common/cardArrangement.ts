import { createContext, useContext } from "react";

/**
 * The shape a card's artwork comes in. Each domain names its own once; a surface mixing media reads
 * it off the item.
 *
 * A cover is portrait too, and is arranged like one. It is a shape of its own because its ratio is
 * only approximately known: posters are authored to one pixel size, where book covers come from
 * their publishers and vary by several percent each. A surface standing many pictures side by side
 * crops a cover to its declared ratio as it does the other two; a surface showing one picture lets
 * a cover take its own — see `shapeIsExact` and `tiledArtworkSx`.
 */
export type ArtworkShape = "banner" | "poster" | "cover";

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
  banner: "stacked",
  poster: "beside",
  cover: "beside",
};

export const shapeToArrangement = (shape: ArtworkShape): CardArrangement => shapeArrangements[shape];

/**
 * The shape every artwork of a kind is drawn at: banners 16:9, posters 680×1000 — the exact pixel
 * size the poster buckets hold, so a canonical file fills its box with nothing left over — and
 * covers 13:20, the ratio that crops the library's covers least. The 243 covers in the book bucket
 * outside Animorphs run from 0.58 to 0.71 with a median of 0.652; held to 13:20 they lose 2.7% of
 * a side on average and 44 lose more than 5%, against 3.6% and 61 at 2:3 and 5.2% and 102 at the
 * poster's 0.68. What is left over five percent is four series: Wheel of Time and Sword of Truth
 * near 0.60 and Fear Street near 0.58, cut top and bottom, and Keys to the Kingdom near 0.70, cut
 * at the sides. Animorphs, 54 covers at 0.69, lose 6% of their width, which on those covers is
 * plain background.
 *
 * The ratio a layout measures is this one and never the file's own. Artwork is authored to it, but
 * an individual image can be off by a few pixels, and a band that took each picture's measured ratio
 * would stand two cards of one shape at different widths for a reason no reader can see — a mistake in
 * one file becoming a visible difference in the page. Sizing from the declared ratio makes every
 * poster card identical and leaves an off-size file to be letterboxed rather than to move the layout.
 *
 * A cover is the exception, and `shapeIsExact` is what says so: no two covers share a ratio, so a
 * cover held to 13:20 is cropped and not merely trimmed of a stray pixel. That is the trade
 * wherever pictures tile (`tiledArtworkSx`) and nowhere else: a surface showing one cover lets it
 * take the ratio its file holds — standing at its real width against a fixed height — and absorbs
 * the difference in whatever sits beside it.
 */
export const shapeRatioValues: Record<ArtworkShape, number> = {
  banner: 16 / 9,
  poster: 680 / 1000,
  cover: 13 / 20,
};

const shapeRatios: Record<ArtworkShape, string> = {
  banner: "16 / 9",
  poster: "680 / 1000",
  cover: "13 / 20",
};

export const shapeToRatio = (shape: ArtworkShape): string => shapeRatios[shape];

/**
 * Whether every artwork of this shape is authored to `shapeRatioValues` exactly, and so can be held
 * to it without cropping anything. False only for covers, whose ratio a surface showing one of them
 * treats as a reservation and never a size.
 */
const shapeExact: Record<ArtworkShape, boolean> = {
  banner: true,
  poster: true,
  cover: false,
};

export const shapeIsExact = (shape: ArtworkShape): boolean => shapeExact[shape];

/**
 * The `aspect-ratio` a surface showing one picture states for a shape it pins one dimension of:
 * the ratio itself where every file holds it, so the size is known before the file lands, and the
 * `auto` reservation for a cover, so the file's own ratio wins once it does. A hover card and the
 * Now band's cards are those surfaces.
 */
export const shapeToPinnedAspect = (shape: ArtworkShape): string =>
  shapeIsExact(shape) ? shapeToRatio(shape) : shapeToAspect(shape);

/**
 * A picture standing among others — a wall, a shelf, a strip, a grid of months — held to its shape
 * exactly and cropped to it.
 *
 * Side by side, a picture's own ratio is a difference between neighbours that means nothing: a
 * cover a few percent narrower than the one beside it breaks the row's grid for a reason no reader
 * can see, and a wall reserving the declared ratio before its files load lands every jump short by
 * what the files then add. Held exactly, every card of a shape is one size before and after its
 * file arrives. A banner or a poster loses nothing; what a cover loses is stated on
 * `shapeRatioValues`.
 */
export const tiledArtworkSx = (shape: ArtworkShape) =>
  ({ aspectRatio: shapeToRatio(shape), objectFit: "cover" }) as const;

/**
 * A picture at a stated height among others, its width following from its shape — the timeline's
 * pictures, sized as the walls size theirs.
 */
export const pictureAtHeight = (shape: ArtworkShape, height: number) =>
  ({ height, width: "auto", ...tiledArtworkSx(shape) }) as const;

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
  banner: `auto ${shapeRatios.banner}`,
  poster: `auto ${shapeRatios.poster}`,
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
 * 13:20 rather than cropping them: a hover card shows one picture, and the whole of it.
 */
export const hoverCardArtworkSx = (shape: ArtworkShape) =>
  shapeToArrangement(shape) === "beside"
    ? {
        aspectRatio: shapeToPinnedAspect(shape),
        height: HOVER_CARD_ASIDE_ARTWORK_HEIGHT,
        width: "auto",
      }
    : { aspectRatio: shapeToRatio("banner") };
