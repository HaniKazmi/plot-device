import { YearMonthDay } from "../common/date";
import {
  ANIME,
  KeysMatching,
  animeToColour,
  certificateToColour,
  fill,
  franchiseToColour,
  genreToColour,
  pick,
  statusToColour,
  type Certificate,
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
  /** Whether the sheet's Type column marks the show as anime, which is the one split it records. */
  anime: boolean;
  genre: string;
  /**
   * The sheet lists these in one cell and never repeats `genre` among them, so the two fields
   * together are the show's full set rather than an overlapping pair. Empty where the sheet says
   * nothing, which is 23 of 308 shows.
   */
  otherGenres: string[];
  network: string;
  certificate: Certificate;
  /** A show with no wider franchise carries its own name here, which 229 of 308 shows do. */
  franchise: string;
  s: Season[];
  e: number;
  minutes: number;
  artwork: string;
}

export interface Season {
  s: number;
  e: number;
  subtitle?: string;
  startDate: YearMonthDay;
  endDate?: YearMonthDay;
  /** Absent where the sheet has no runtime for the season yet, in which case `minutes` is 0. */
  episodeLength?: number;
  minutes: number;
  /**
   * When an episode of this season was last watched: its own end date once it has finished, and
   * the sheet's `Seasons / Last Watched` cell while it is still running — the two the sheet never
   * holds together. Absent where the season is in progress and the cell is blank, which is every
   * season before the convention.
   */
  lastWatchedDate?: YearMonthDay;
  show: Show;
}

export type Status = "Watching" | "Up To Date" | "Ended" | "Cancelled" | "Abandoned";

/**
 * Anime, or the tab's own word for everything else — what a chart groups this library by, and the
 * value the box shelves.
 *
 * The anime half is `ANIME` and not a literal, since Movies labels its own split with the same
 * constant and the box folds the two into one shelf on that string. The other half is "Show"
 * rather than a shared word: a series that is not anime is a show, and the sheet claims nothing
 * more specific than that about it.
 */
const NOT_ANIME = "Show";

export const animeLabel = ({ anime }: { anime: boolean }) => (anime ? ANIME : NOT_ANIME);

/**
 * The split's two words in the order every surface bands them, the unmarked half first.
 *
 * Stated once beside the labelling it has to agree with: the Vitals band matches this array against
 * `animeLabel`'s output by string, and the filter's chips are the same pair, so a word changed in
 * one place and not the other silently drops a bar and a chip rather than failing to compile.
 */
export const ANIME_GROUP = [NOT_ANIME, ANIME];

export type ShowStringKeys = KeysMatching<Show, string>;

export type Measure = "Shows" | "Seasons" | "Episodes" | "Hours";

export const isShow = (arg: Show | Season): arg is Show => "name" in arg;

/**
 * The broadcasters and streamers with a colour, as fills built the way `game/types.ts` builds its
 * franchise brands: hue and chroma are the brand's, and only lightness moves, as far as the fill
 * contract on `NEUTRAL_FILL` demands of each half.
 *
 * The table covers the broadcasters a reader would recognise as brands, verified against their
 * current identities: HBO is a graphite because that is what its 2025 rebrand made it. The long
 * tail — the sheet holds seventy-odd distinct values, most of them anime studios with a handful of
 * shows each — has none: a vocabulary nobody can learn teaches nothing, and the charts' palette
 * fallback separates them fine. That rule leaves Madhouse, at 15 shows the tab's joint second
 * largest network, in a palette colour beside eleven branded ones, and FX, Starz and The CW at 5
 * shows each uncoloured where CBS, Fox and AMC at the same size are not; an entry costs a brand
 * hex that clears the fill contract on both papers.
 */
const networkColours: Record<string, Fill> = {
  Netflix: fill("#e50914", "#e50914"),
  "Prime Video": fill("#009fd5", "#00a8e1"),
  // Deep, so it clears the Shows app bar, which is a teal of its own at the top of this page.
  "Disney+": fill("#005353", "#42a3a3"),
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

export const groupToColour = (group: keyof Show | "none" | "show", show: Show, scheme: Scheme) => {
  switch (group) {
    case "status":
      return statusToColour(show, scheme);
    case "certificate":
      // The same map the games tab paints its PEGI with, so a swatch means one thing across the app.
      return certificateToColour(show.certificate, scheme);
    case "genre":
      // The vocabulary Movies shares, so one hue means one genre on both tabs.
      return genreToColour(show.genre, scheme);
    case "network":
      return networkToColour(show, scheme);
    case "anime":
      // The pair Movies splits by too, so the rose means anime on either tab.
      return animeToColour(animeLabel(show), scheme);
    case "franchise":
      // The table `utils/types.ts` shares with Games and Movies, so Star Trek is one colour whether
      // it is drawn here or on the Omnibus. 229 of 308 shows carry their own name in this column
      // and take the empty answer, which hands the choice to Highcharts.
      return franchiseToColour(show, scheme);
    default:
      return "" as Colour;
  }
};
