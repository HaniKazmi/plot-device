import { createStore } from "./store";

/**
 * Whether the sheet of keyboard shortcuts is open.
 *
 * A store rather than a flag in the shell for the box's own reason (`searchOpen.ts`): the two doors
 * — `?` anywhere and an item in the app bar's menu — are on either side of the tree from the sheet,
 * and a flag lifted over all three re-renders the page on each open.
 */
const store = createStore(false);

export const openShortcuts = () => store.set(true);

export const closeShortcuts = () => store.set(false);

export const useShortcutsOpen = () => store.useValue();
