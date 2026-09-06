import { createContext, useContext } from "react";

/**
 * Whether the page the reader is on has been narrowed to nothing by their own settings, and the
 * way to undo that.
 *
 * A context rather than a node each shell is handed. Every chart, band and wall on a page draws the
 * same message for the same reason — the library is not empty, something narrowed it — so the
 * answer belongs to the page and not to any one of them; passed down, it is a prop threaded through
 * sixteen domain wrappers, all of them forwarding a node they never look at, and a shell added
 * later is silently the one that says nothing.
 *
 * `active` is the whole test, not half of it: a shell asks it at the empty branch it already has,
 * so a chart emptied by a control of its own — the games timeline's own floor, a grouping that
 * yields no rings — keeps stating that in its own words while the page around it still has rows.
 *
 * Which of the two settings narrowed it travels with the flag, because the message names what
 * emptied the page and offers that setting's own way back: a reader told "nothing matches these
 * filters" on a page holding no filters at all has been sent to look for a control that is not
 * lit. Both are the page's own dispatch. The default is the state outside a provider: no page, so
 * nothing to say and nothing to undo.
 */
export interface NothingMatchesState {
  /** Whether the page's own settings have left it with no rows at all. */
  active: boolean;
  /** Whether any filter is set, which is one of the two things that can have emptied it. */
  filtersActive: boolean;
  /** The scope in its own words — "In 2019" — where it narrows the page, and absent at all time. */
  scope: string | undefined;
  clearFilters: () => void;
  clearScope: () => void;
}

export const NothingMatchesContext = createContext<NothingMatchesState>({
  active: false,
  filtersActive: false,
  scope: undefined,
  clearFilters: () => {},
  clearScope: () => {},
});

export const useNothingMatches = (): NothingMatchesState => useContext(NothingMatchesContext);
