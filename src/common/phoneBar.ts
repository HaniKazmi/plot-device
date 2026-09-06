import { createStore } from "./store";

/**
 * The two things the bar fixed to a phone's bottom edge (`BottomTabs.tsx`) and the page's own rail
 * (`SectionRail.tsx`) have to say to each other: where the rail is drawn, and when the reader has
 * asked for the tabs back.
 *
 * The two are on opposite sides of the tree — the bar is mounted above the outlet, the rail by the
 * tab's own lazy `Graphs` inside it — so the rail reaches its slot through a portal, and the slot
 * has to travel from a node the bar only has after its first commit. Stores rather than a context:
 * a provider around both would sit above every tab and re-render the whole page each time either
 * answer changed, where this re-renders the one component that reads it. They are also what keeps
 * the bar from having to know what a page's sections are, which only the page it is drawn over does,
 * and the rail from having to know which state the bar is in.
 *
 * Two stores rather than one value, so the rail is not re-rendered by a press that only concerns the
 * bar.
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

const tabsAskedStore = createStore(false);

/**
 * Calls the five tabs back into the bar without moving the page, and is cleared by the reader's next
 * scroll: the alternative — going back to the top, where the tabs already are — costs a reader deep
 * in a library wall their position to answer a question about navigation.
 */
export const askPhoneBarTabs = () => {
  tabsAskedStore.set(true);
};

export const dismissPhoneBarTabs = () => {
  tabsAskedStore.set(false);
};

export const usePhoneBarTabsAsked = () => tabsAskedStore.useValue();
