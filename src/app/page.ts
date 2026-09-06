import type { PageDispatch, PageState } from "../common/filterReducer";
import { useCurrentTab, type Tab } from "../tabs";
import { useLibrary } from "./library";
import { pageOf, usePageState, type PageSurface } from "./pageState";

/**
 * The page a surface standing above the tabs is drawn over: which tab it is, what that tab can be
 * narrowed by, the state it is narrowed to, and where to send a change.
 *
 * The three surfaces that ask — the rail, the box that filters a page and the empty state's own
 * card — each held the same four lines: the tab, the library, that tab's state and its page
 * module. Four lookups in one order is a rule about how a page is reached, and three copies of it
 * are three that can be handed a state and a module belonging to different tabs.
 *
 * `page` is `undefined` while the tab's own rows are still in flight: a control surface over a
 * library that is not here offers no values and a population of zero, where drawing nothing says
 * the page is still landing. `state` and `dispatch` are answered regardless — the stores are
 * module-scope and outlive the rows.
 *
 * Its own file beside `pageState.ts` rather than in it, because this is the one part of the page
 * lookup that names the current tab: `tabs.ts` imports the five entry components eagerly, and the
 * rule that keeps `app/` clear of it is what stops the registry being evaluated half-built. Named
 * here, `tabs.ts` is reached only from the three surfaces that already stand below it, and nothing
 * the registry itself imports reaches this file.
 */
export const usePage = (): {
  tab: Tab;
  page: PageSurface | undefined;
  state: PageState;
  dispatch: PageDispatch;
} => {
  const tab = useCurrentTab();
  const library = useLibrary();
  const [state, dispatch] = usePageState(tab.id);

  return { tab, page: pageOf(tab.id, library), state, dispatch };
};
