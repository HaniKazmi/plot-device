import {
  certificateCategory,
  franchiseCategory,
  FRANCHISE_KEY,
  styleCategory,
  type FilterSchema,
} from "../common/filterSchema";
import {
  CERTIFICATES,
  certificateToColour,
  formatToColour,
  genreToColour,
  type Certificate,
  type Predicate,
} from "../utils/types";
import type { FilterState } from "./filterUtils";
import {
  companyToColor,
  gameplayToColour,
  platformCompany,
  platformShortName,
  platformToColor,
  type Company,
  type Gameplay,
  type Platform,
  type VideoGame,
} from "./types";

/**
 * What guest mode hides on this tab: a game the sheet themes as adult.
 *
 * Exported rather than folded into the schema, because the mode is applied to the library itself,
 * above every tab. A mode narrowing this page's charts alone would leave a hidden game on screen
 * through the franchise index and the union, which are built from the library.
 */
export const guestFilter: Predicate<VideoGame> = (game) => !game.themes.includes("Adult");

export const gameFilters: FilterSchema<VideoGame, FilterState> = {
  toggles: [
    { key: "endless", label: "Endless games", hides: (game) => game.status !== "Endless" },
    { key: "pokemon", label: "Pokémon", hides: (game) => game.franchise !== "Pokémon" },
  ],
  categories: [
    {
      key: "platform",
      label: "platform",
      valueOf: (game) => game.platform,
      // The chips wear the company's colour on the parent alone: fifteen platforms resolve through
      // five company fills, so a swatch on every child would say the colour means the platform.
      colourFor: (value, scheme) => platformToColor(value as Platform, scheme),
      // Fifteen platforms are five companies, and "all my Nintendo games" is the narrowing a reader
      // means — seven chips pressed in a row otherwise, with nothing on the row saying they belong
      // together. The company already leads this tab everywhere else: it is what the barchart splits
      // by, what the sunburst nests on first and what the library wall's border draws.
      group: {
        label: "company",
        of: platformCompany,
        colourFor: (company, scheme) => companyToColor({ company: company as Company }, scheme),
        labelFor: platformShortName,
      },
    },
    {
      key: "format",
      label: "format",
      valueOf: (game) => game.format,
      // The shared table, so a Physical game and a Physical book are one colour and one hit: the box
      // folds on the word, and both sheets write that one the same way. Digital and eBook stay two
      // values for the same reason — the sheets spell them apart, and their kinship is stated where
      // the app already states it, in the one `SCREEN_FILL` they both draw.
      colourFor: formatToColour,
    },
    {
      key: "genre",
      label: "genre",
      valueOf: (game) => game.genre,
      // The ramp Shows and Movies share, muted — the same treatment this tab's genre charts take,
      // so a chip and a wedge naming one genre are one colour.
      colourFor: genreToColour,
    },
    styleCategory("style", (game) => game.style),
    certificateCategory(
      "certificate",
      (game) => game.certificate,
      CERTIFICATES,
      (value, scheme) => certificateToColour(value as Certificate, scheme),
    ),
    {
      key: "gameplay",
      label: "gameplay",
      valueOf: (game) => game.gameplay,
      // The ramp this tab's own charts group by, so a chip, a wedge and a bar naming one gameplay
      // are one colour. Cast rather than guarded, as the certificate above it is: the converter
      // rejects a cell outside `GAMEPLAY` while it still knows the row, and the lookup falls to the
      // neutral rather than throwing, so an unknown value here is a plain chip and not a blank page.
      colourFor: (value, scheme) => gameplayToColour({ gameplay: value as Gameplay }, scheme),
    },
    { key: "publisher", label: "publisher", valueOf: (game) => game.publisher, searchable: true },
    franchiseCategory(FRANCHISE_KEY),
  ],
};
