import { createContext, useContext } from "react";

/**
 * What holds a popper open while something it opened stands over it.
 *
 * A hover card's picture opens the item's expanded card, and that dialog is a child of the
 * tooltip's own content: its backdrop takes the pointer off the popper, the popper closes on the
 * leave, and React unmounts the dialog with the subtree it was rendered in — the card would open
 * and vanish in the same frame. So the card being opened says so, and the popper stays open until
 * the dialog has finished leaving. The default is a pair of no-ops, since every card outside a
 * popper — a wall's, a strip's, a sheet's — renders its dialog under nothing that can close.
 */
interface HoverCardHold {
  hold: () => void;
  release: () => void;
}

const NO_HOLD: HoverCardHold = { hold: () => {}, release: () => {} };
export const HoverCardHoldContext = createContext<HoverCardHold>(NO_HOLD);

/** For a card that opens a layer of its own: see above. */
export const useHoverCardHold = () => useContext(HoverCardHoldContext);
