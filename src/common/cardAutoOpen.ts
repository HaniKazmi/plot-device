import { createContext, useContext } from "react";

/**
 * What tells a card mounted for its layer alone to open that layer at once.
 *
 * A packed timeline's hover card ignores the pointer, so a reader can run down the rows without
 * the card standing in the way — which leaves a mouse no way through the card to the item behind
 * it. The press moves to the mark instead, and the mark has no card to press: the chart mounts the
 * hover card it would have shown, out of sight, and this is how it says "open yourself".
 *
 * A context rather than a prop, because the chart holds a thunk that renders somebody else's hover
 * card and cannot reach inside it — every domain's card would otherwise have to thread a flag from
 * its own signature down to the `CardMediaImage` at the bottom of it.
 *
 * `onClosed` is the other half: the host keeps the card mounted only while its layer is up, and a
 * card that opens a layer of its own is the only thing that knows when that layer has gone.
 */
export interface CardAutoOpen {
  auto: boolean;
  onClosed: () => void;
}

/**
 * What every card below the one that took the signal sees.
 *
 * The signal reaches a card through the tree, so without this it reaches everything that card
 * draws as well — a card standing for a group opens the group, and every card in the group then
 * reads the same signal and opens itself, which is a shelf under a stack of its own members. A
 * card consuming the signal hands this down in its place.
 */
export const NOT_AUTO_OPEN: CardAutoOpen = { auto: false, onClosed: () => {} };

export const CardAutoOpenContext = createContext<CardAutoOpen>(NOT_AUTO_OPEN);

/** For a card that can open a layer: see above. The default is every card drawn anywhere else. */
export const useCardAutoOpen = () => useContext(CardAutoOpenContext);
