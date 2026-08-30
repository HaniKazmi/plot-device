import { YearMonthDay } from "../common/date";
import { KeysMatching, ageRatingToColour, statusToColour, type AgeRating, type Colour } from "../utils/types";

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

export const groupToColour = (group: keyof Show | "none" | "show", show: Show) => {
  switch (group) {
    case "status":
      return statusToColour(show);
    case "rating":
      // The same map the games tab paints its PEGI with, so a swatch means one thing across the app.
      return ageRatingToColour(show.rating);
    default:
      // Genre, network and franchise have no colour vocabulary here — a swatch on any of them
      // would teach a legend no chart honours. "" hands the choice to Highcharts.
      return "" as Colour;
  }
};
