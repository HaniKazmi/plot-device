import { Year } from "../common/date";
import { franchiseOptions } from "../common/filterOptions";
import type { FilterSchema } from "../common/filterSchema";
import { genreToColour, type Predicate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { vgFranchise } from "./franchiseContext";
import { platformToColor, type Platform, type VideoGame } from "./types";

/**
 * What guest mode hides on this tab: a game the sheet themes as adult.
 *
 * Exported rather than folded into the schema, because the mode is applied to the library itself,
 * above every tab. A mode narrowing this page's charts alone would leave a hidden game on screen
 * through the franchise index and the union, which are built from the library.
 */
export const guestFilter: Predicate<VideoGame> = (vg) => !vg.theme.includes("Adult");

/**
 * A game whose start date came off a platform that records one, rather than out of memory: the
 * five consoles that report a first-played date, and PC only where the sheet holds a full date
 * from 2015 on. A console game logged as a bare year is kept — the platform still says when it was
 * played; a PC one is not, that column being where the guesses are.
 *
 * Named rather than written into the schema inline: it is the one toggle here whose rule is a
 * paragraph, and a paragraph inside a list of one-line predicates hides the other two.
 */
const datesConfirmed: Predicate<VideoGame> = (vg) => {
  if (vg.platform === "PC") return !(vg.startDate instanceof Year) && vg.startDate.year >= 2015;

  return ["Nintendo Switch", "Nintendo Switch 2", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(
    vg.platform,
  );
};

export const vgFilters: FilterSchema<VideoGame, FilterState> = {
  toggles: [
    { key: "endless", label: "Endless games", hides: (vg) => vg.status !== "Endless" },
    { key: "unconfirmed", label: "Unconfirmed dates", hides: datesConfirmed },
    { key: "pokemon", label: "Pokémon", hides: (vg) => vg.franchise !== "Pokémon" },
  ],
  categories: [
    {
      key: "platform",
      label: "platform",
      valueOf: (vg) => vg.platform,
      colourFor: (value, scheme) => platformToColor(value as Platform, scheme),
    },
    {
      key: "genre",
      label: "genre",
      valueOf: (vg) => vg.genre,
      // The ramp Shows and Movies share, muted — the same treatment this tab's genre charts take,
      // so a chip and a wedge naming one genre are one colour.
      colourFor: genreToColour,
    },
    { key: "gameplay", label: "gameplay", valueOf: (vg) => vg.gameplay },
    { key: "publisher", label: "publisher", valueOf: (vg) => vg.publisher, searchable: true },
    {
      key: "franchise",
      label: "franchise",
      valueOf: (vg) => vg.franchise,
      options: (data) => franchiseOptions(data, vgFranchise, (vg) => vg.name),
      searchable: true,
    },
  ],
};
