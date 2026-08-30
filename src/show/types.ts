import { YearMonthDay } from "../common/date";
import {
  KeysMatching,
  ageRatingToColour,
  genreToColour,
  statusToColour,
  type AgeRating,
  type Colour,
} from "../utils/types";

export interface Show {
  name: string;
  status: Status;
  startDate: YearMonthDay;
  // A show still running has no end, which is the one absence the sheet means rather than owes.
  endDate?: YearMonthDay;
  type: Type;
  genre: string;
  /**
   * The genres beyond the primary one. The sheet lists them in a single cell and never repeats
   * `genre` among them, so the two together are the show's full set rather than an overlapping
   * pair. Empty where the sheet says nothing, which is 23 of 308 shows.
   */
  genres: string[];
  network: string;
  rating: AgeRating;
  /** A show with no wider franchise carries its own name here, which 229 of 308 shows do. */
  franchise: string;
  /**
   * When an episode was last watched, rolled up from the seasons — the sheet's own answer to
   * which of several in-flight shows is the current one. Absent until the sheet marks it.
   */
  lastWatchedDate?: YearMonthDay;
  s: Season[];
  e: number;
  minutes: number;
  banner: string;
}

export interface Season {
  s: number;
  e: number;
  subtitle?: string;
  startDate: YearMonthDay;
  endDate?: YearMonthDay;
  episodeLength: number;
  minutes: number;
  /** When an episode of this season was last watched. Most rows leave the column blank. */
  lastWatchedDate?: YearMonthDay;
  show: Show;
}

export type Status = "Watching" | "Up To Date" | "Ended" | "Cancelled" | "Abandoned";

/** The sheet's own values, which are lower case. */
export type Type = "show" | "anime";

/** `Type` as a chart labels it — the sheet's values are lower case and a wedge should not be. */
export const typeToName = (type: Type) => (type === "anime" ? "Anime" : "Show");

export type ShowStringKeys = KeysMatching<Show, string>;

export type Measure = "Shows" | "Episodes" | "Hours";

export const isShow = (arg: Show | Season): arg is Show => "name" in arg;

/**
 * The broadcasters and streamers with a colour, as fills built the way `vg/types.ts` builds its
 * franchise brands: hue and chroma are the brand's, and only lightness moves, as far as the fill
 * contract on `NEUTRAL_FILL` demands. Every value here meets the full 3:1 on both papers.
 *
 * The table covers the networks a reader would recognise as brands. The long tail — the sheet
 * holds seventy-odd distinct values, most of them anime studios with a handful of shows each —
 * deliberately has none: a vocabulary nobody can learn teaches nothing, and the charts' palette
 * fallback separates them fine.
 */
const networkColours: Record<string, Colour> = {
  Netflix: "#e21c26" as Colour,
  "Apple TV": "#6e7791" as Colour,
  HBO: "#925ddd" as Colour,
  "Prime Video": "#008ccc" as Colour,
  BBC: "#de207f" as Colour,
  "Disney+": "#4568d8" as Colour,
  AMC: "#a8811e" as Colour,
  Fox: "#0d7aee" as Colour,
  CBS: "#2a63e7" as Colour,
  Hulu: "#0c914f" as Colour,
};

/**
 * `""` rather than a throw off the table — the deliberate opposite of `platformToColor`. A
 * platform is a closed set where an unknown value is a typo worth crashing on; the network column
 * gains a new streamer or studio whenever one launches, and a crash is the wrong response to that.
 */
export const networkToColour = ({ network }: { network: string }): Colour => networkColours[network] ?? ("" as Colour);

/**
 * Exhaustive over `Type`, so adding a type without deciding its colour is a compile error.
 * Both meet the fill contract; anime takes the rose its fandom paints in, shows a broadcast indigo.
 */
const typeColours: Record<Type, Colour> = {
  show: "#5d71d7" as Colour,
  anime: "#e33b81" as Colour,
};

export const typeToColour = ({ type }: { type: Type }): Colour => typeColours[type];

export const groupToColour = (group: keyof Show | "none" | "show", show: Show) => {
  switch (group) {
    case "status":
      return statusToColour(show);
    case "rating":
      // The same map the games tab paints its PEGI with, so a swatch means one thing across the app.
      return ageRatingToColour(show.rating);
    case "genre":
      // The vocabulary Movies shares, so one hue means one genre on both tabs.
      return genreToColour(show.genre);
    case "network":
      return networkToColour(show);
    case "type":
      return typeToColour(show);
    default:
      // Franchise has no colour vocabulary here — 229 of 308 shows carry their own name in the
      // column, so a table would be near-empty and a swatch on it would teach a legend no chart
      // honours. "" hands the choice to Highcharts.
      return "" as Colour;
  }
};
