import { createContext, useContext } from "react";

/**
 * The shape a card's artwork comes in. Each domain names its own once; a surface mixing media reads
 * it off the item.
 */
export type ArtworkShape = "landscape" | "portrait";

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
export type CardArrangement = "stacked" | "beside";

const shapeArrangements: Record<ArtworkShape, CardArrangement> = {
  landscape: "stacked",
  portrait: "beside",
};

export const shapeToArrangement = (shape: ArtworkShape): CardArrangement => shapeArrangements[shape];

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
  landscape: "auto 16 / 9",
  portrait: "auto 2 / 3",
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
