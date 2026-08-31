import { createContext, useContext } from "react";

/**
 * The shape a card's artwork comes in, which is the whole of what decides how the card is arranged:
 * **landscape artwork stacks its words below, portrait artwork seats them beside**.
 *
 * One rule rather than two, because the two shapes fail in opposite directions under the other
 * arrangement. A banner under a text column is four times as wide as it is tall, so the words get a
 * sliver of a column and every title truncates; a poster over a text strip is half as wide as it is
 * tall, so the strip is a hundred pixels across and truncates just as badly. Arranging by shape
 * gives each of them the axis it has room on, and a row of mixed media then varies gently in width
 * at one height rather than holding some cards to a shape their artwork does not have.
 *
 * It is stated as the artwork's shape rather than as the arrangement itself so that a caller says
 * what it has and the shell decides what to do about it — a caller naming the arrangement can put a
 * beside-styled panel on a stacked card, which is the disagreement this replaces.
 */
export type ArtworkShape = "landscape" | "portrait";

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
 * The shape published by the card a panel is rendered inside.
 *
 * The panel is the caller's node rather than the shell's, so the arrangement cannot be handed down
 * as a prop without every one of the three domains repeating the decision at each of its card
 * sites. Read from the card instead, exactly as the sampled accent is, and the rule holds wherever
 * a card carries words.
 *
 * `landscape` is the default a panel outside any card falls to, which is the stacked arrangement —
 * the one that needs nothing of its container.
 */
const CardArrangement = createContext<ArtworkShape>("landscape");

export const CardArrangementProvider = CardArrangement.Provider;

export const useCardArrangement = (): ArtworkShape => useContext(CardArrangement);
