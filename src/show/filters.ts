import { certificateCategory, franchiseCategory, type FilterSchema } from "../common/filterSchema";
import {
  ANIME,
  CERTIFICATES,
  animeToColour,
  certificateToColour,
  genreToColour,
  type Certificate,
  type Predicate,
} from "../utils/types";
import type { FilterState } from "./filterUtils";
import { networkToColour, type Show } from "./types";

/**
 * What guest mode hides on this tab: anime, which is also what the anime toggle drops — one rule
 * for the two, so the mode and the toggle cannot hide by two different definitions.
 *
 * Exported because the mode is applied to the library itself, above every tab: narrowing this
 * page's charts alone would leave a hidden show on screen through the franchise index and the
 * union, which are built from the library.
 */
export const guestFilter: Predicate<Show> = (show) => !show.anime;

export const showFilters: FilterSchema<Show, FilterState> = {
  toggles: [
    { key: "abandoned", label: "Abandoned shows", hides: (show) => show.status !== "Abandoned" },
    // The toggle's rule is guest mode's own function and not a copy of it, so the two cannot come
    // to hide by different definitions of what anime is.
    //
    // Shelved, because anime is a thing a reader goes looking for rather than a page's own noise,
    // and Movies labels its own switch identically — one entry in the box's index, one shelf
    // holding both media. The colour is the pair both tabs split by.
    {
      key: "anime",
      label: ANIME,
      hides: guestFilter,
      shelf: true,
      colourFor: (value, scheme) => animeToColour(value, scheme),
    },
  ],
  categories: [
    {
      key: "genre",
      label: "genre",
      // The primary genre only, not `genres`: the charts group on `genre`, and a filter also
      // matching the secondary list would keep shows the Top Genre bar attributes elsewhere —
      // the two halves of the page would disagree about what "Drama" holds.
      valueOf: (show) => show.genre,
      colourFor: genreToColour,
    },
    {
      key: "network",
      label: "network",
      valueOf: (show) => show.network,
      colourFor: (value, scheme) => networkToColour({ network: value }, scheme) || undefined,
    },
    certificateCategory<Show>(
      (show) => show.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    franchiseCategory(),
  ],
};
