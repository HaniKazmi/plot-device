import { createStore } from "./store";

/**
 * The one thing the bar fixed to a phone's bottom edge (`BottomTabs.tsx`) and the page's own rail
 * (`SectionRail.tsx`) have to say to each other: where the rail is drawn.
 *
 * The two are on opposite sides of the tree — the bar is mounted above the outlet, the rail by the
 * tab's own lazy `Graphs` inside it — so the rail reaches its slot through a portal, and the slot
 * has to travel from a node the bar only has after its first commit. A store rather than a context:
 * a provider around both would sit above every tab and re-render the whole page each time the
 * answer changed, where this re-renders the one component that reads it. It is also what keeps the
 * bar from having to know what a page's sections are, which only the page it is drawn over does.
 */
const slotStore = createStore<HTMLElement | null>(null);

/**
 * `null` until the bar has mounted, and again from `sm` up where it draws no rail at all: a rail
 * with nowhere to go renders nothing rather than falling back to the top of the page, which is the
 * position this arrangement exists to give up.
 */
export const usePhoneBarSlot = () => slotStore.useValue();

/** Handed to the slot element's `ref`, so it arrives on mount and clears on unmount. */
export const setPhoneBarSlot = (node: HTMLElement | null) => {
  slotStore.set(node);
};
