import { animeCategory, certificateCategory, franchiseCategory, type FilterSchema } from "../common/filterSchema";
import { CERTIFICATES, certificateToColour, genreToColour, type Certificate, type Predicate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { animeLabel, networkToColour, type Show } from "./types";

/**
 * What guest mode hides on this tab: anime, read off the same model field the anime select is
 * built over, so the mode and the control cannot come to hide by two definitions.
 *
 * Exported because the mode is applied to the library itself, above every tab: narrowing this
 * page's charts alone would leave a hidden show on screen through the franchise index and the
 * union, which are built from the library.
 */
export const guestFilter: Predicate<Show> = (show) => !show.anime;

export const showFilters: FilterSchema<Show, FilterState> = {
  toggles: [{ key: "abandoned", label: "Abandoned shows", hides: (show) => show.status !== "Abandoned" }],
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
    animeCategory<Show>(animeLabel, "Show"),
    certificateCategory<Show>(
      (show) => show.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    franchiseCategory(),
  ],
};
