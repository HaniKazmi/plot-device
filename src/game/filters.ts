import { Year } from "../common/date";
import { franchiseCategory, type FilterSchema } from "../common/filterSchema";
import { genreToColour, type Predicate } from "../utils/types";
import type { FilterState } from "./filterUtils";
import { platformToColor, type Platform, type VideoGame } from "./types";

/**
 * What guest mode hides on this tab: a game the sheet themes as adult.
 *
 * Exported rather than folded into the schema, because the mode is applied to the library itself,
 * above every tab. A mode narrowing this page's charts alone would leave a hidden game on screen
 * through the franchise index and the union, which are built from the library.
 */
export const guestFilter: Predicate<VideoGame> = (game) => !game.theme.includes("Adult");

/**
 * A game whose start date came off a platform that records one, rather than out of memory: the
 * five consoles that report a first-played date, and PC only where the sheet holds a full date
 * from 2015 on. A console game logged as a bare year is kept — the platform still says when it was
 * played; a PC one is not, that column being where the guesses are.
 *
 * Named rather than written into the schema inline: it is the one toggle here whose rule is a
 * paragraph, and a paragraph inside a list of one-line predicates hides the other two.
 */
const datesConfirmed: Predicate<VideoGame> = (game) => {
  if (game.platform === "PC") return !(game.startDate instanceof Year) && game.startDate.year >= 2015;

  return ["Nintendo Switch", "Nintendo Switch 2", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(
    game.platform,
  );
};

export const gameFilters: FilterSchema<VideoGame, FilterState> = {
  toggles: [
    { key: "endless", label: "Endless games", hides: (game) => game.status !== "Endless" },
    { key: "unconfirmed", label: "Unconfirmed dates", hides: datesConfirmed },
    { key: "pokemon", label: "Pokémon", hides: (game) => game.franchise !== "Pokémon" },
  ],
  categories: [
    {
      key: "platform",
      label: "platform",
      valueOf: (game) => game.platform,
      colourFor: (value, scheme) => platformToColor(value as Platform, scheme),
    },
    {
      key: "genre",
      label: "genre",
      valueOf: (game) => game.genre,
      // The ramp Shows and Movies share, muted — the same treatment this tab's genre charts take,
      // so a chip and a wedge naming one genre are one colour.
      colourFor: genreToColour,
    },
    { key: "gameplay", label: "gameplay", valueOf: (game) => game.gameplay },
    { key: "publisher", label: "publisher", valueOf: (game) => game.publisher, searchable: true },
    franchiseCategory(),
  ],
};
