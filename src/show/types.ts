import { YearMonthDay } from "../common/date";
import {
  KeysMatching,
  ageRatingToColour,
  fill,
  franchiseToColour,
  genreToColour,
  pick,
  statusToColour,
  type AgeRating,
  type Colour,
  type Fill,
  type Scheme,
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
 * contract on `NEUTRAL_FILL` demands of each half.
 *
 * The table covers the networks a reader would recognise as brands, verified against their current
 * identities: HBO is a graphite because that is what its 2025 rebrand made it, and NBC is here
 * because it is the second-largest network on this tab. The long tail — the sheet
 * holds seventy-odd distinct values, most of them anime studios with a handful of shows each —
 * deliberately has none: a vocabulary nobody can learn teaches nothing, and the charts' palette
 * fallback separates them fine.
 */
const networkColours: Record<string, Fill> = {
  Netflix: fill("#e50914", "#e50914"),
  "Prime Video": fill("#009fd5", "#00a8e1"),
  "Disney+": fill("#0e7c8c", "#127e8e"),
  Hulu: fill("#00ab5e", "#1ce783"),
  // Keyed on what the sheet writes. The brand is HBO Max and its 2025 rebrand made it
  // monochrome, which is why this is a graphite rather than the purple the name suggests.
  HBO: fill("#5a5a66", "#6f6f7b"),
  "Apple TV": fill("#6a7183", "#777f91"),
  BBC: fill("#f34291", "#ff4e9b"),
  NBC: fill("#0089d0", "#0089d0"),
  Fox: fill("#0c7bc1", "#0c7bc1"),
  CBS: fill("#0057b8", "#216dd0"),
  AMC: fill("#d5202f", "#d5202f"),
};

/** Every network the table colours; the long tail deliberately has none. */
export const NETWORK_NAMES = Object.keys(networkColours);

/**
 * `""` rather than a throw off the table — the deliberate opposite of `platformToColor`. A
 * platform is a closed set where an unknown value is a typo worth crashing on; the network column
 * gains a new streamer or studio whenever one launches, and a crash is the wrong response to that.
 */
export const networkToColour = ({ network }: { network: string }, scheme: Scheme): Colour => {
  const colour = networkColours[network];
  return colour ? pick(colour, scheme) : ("" as Colour);
};

/**
 * Exhaustive over `Type`, so adding a type without deciding its colour is a compile error.
 * Both meet the fill contract; anime takes the rose its fandom paints in, shows a broadcast indigo.
 */
const typeColours: Record<Type, Fill> = {
  show: fill("#006bd1", "#1a82f2"),
  anime: fill("#c42b91", "#de47a8"),
};

export const typeToColour = ({ type }: { type: Type }, scheme: Scheme): Colour => pick(typeColours[type], scheme);

export const groupToColour = (group: keyof Show | "none" | "show", show: Show, scheme: Scheme) => {
  switch (group) {
    case "status":
      return statusToColour(show, scheme);
    case "rating":
      // The same map the games tab paints its PEGI with, so a swatch means one thing across the app.
      return ageRatingToColour(show.rating, scheme);
    case "genre":
      // The vocabulary Movies shares, so one hue means one genre on both tabs.
      return genreToColour(show.genre, scheme);
    case "network":
      return networkToColour(show, scheme);
    case "type":
      return typeToColour(show, scheme);
    case "franchise":
      // The table `utils/types.ts` shares with Games and Movies, so Star Trek is one colour whether
      // it is drawn here or on the Omnibus. 229 of 308 shows carry their own name in this column
      // and take the empty answer, which hands the choice to Highcharts.
      return franchiseToColour(show, scheme);
    default:
      return "" as Colour;
  }
};
