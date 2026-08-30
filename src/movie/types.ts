import type { YearMonthDay } from "../common/date";
import {
  ageRatingToColour,
  decadeToColour,
  genreToColour,
  NEUTRAL_FILL,
  releaseDecade,
  type AgeRating,
  type Colour,
  type KeysMatching,
} from "../utils/types";

export interface Movie {
  name: string;
  releaseDate: YearMonthDay;
  startDate: YearMonthDay;
  rating: AgeRating;
  /** Absent for the handful of films never scored, which is not the same as scoring one zero. */
  score?: number;
  minutes: number;
  genre: string;
  /**
   * The genres beyond the primary one. The sheet lists them in a single cell and never repeats
   * `genre` among them, so the two together are the film's full set rather than an overlapping
   * pair. Empty where the sheet says nothing.
   */
  genres: string[];
  /** A film with no wider franchise carries its own name here. */
  franchise: string;
  director: string;
  banner: string;
  /** Whether it was seen in a cinema rather than at home. */
  cinema: boolean;
  /** Guest mode hides anime here the way it does on the shows tab. */
  anime: boolean;
}

export type MovieStringKeys = KeysMatching<Movie, string>;

export type Measure = "Films" | "Hours";

/**
 * What the charts can group by: the string fields plus three derivations — the release decade,
 * cinema-vs-home, and the score band. The union is the option set rather than `keyof Movie`
 * because those three live on no field; "score" here means the band, since a select box shows
 * these words and "scoreBand" is nobody's vocabulary.
 */
export type MovieGroup = MovieStringKeys | "none" | "decade" | "cinema" | "score";

export const cinemaLabel = ({ cinema }: Movie) => (cinema ? "Cinema" : "Home");

/** Exhaustive over the two values `cinemaLabel` can answer, so both always have a fill. */
const cinemaColours: Record<"Cinema" | "Home", Colour> = {
  // The outing takes the marquee gold; the sofa a settled slate blue. Both meet the fill contract.
  Cinema: "#af7d09" as Colour,
  Home: "#4574b5" as Colour,
};

export const cinemaToColour = (label: string): Colour => cinemaColours[label as "Cinema" | "Home"] ?? NEUTRAL_FILL;

export const scoreBands = ["9–10", "7–8", "5–6", "3–4", "1–2", "Unscored"] as const;

export type ScoreBand = (typeof scoreBands)[number];

/** Five bands so a totals bar's legend fits one line; unscored is its own state, not a low one. */
export const scoreBand = (score: number | undefined): ScoreBand => {
  if (score === undefined) return "Unscored";
  if (score >= 9) return "9–10";
  if (score >= 7) return "7–8";
  if (score >= 5) return "5–6";
  if (score >= 3) return "3–4";
  return "1–2";
};

/**
 * A sequential green ramp, greyed and pale at the bottom and deep and vivid at the top, because a
 * score is ordered and quality reads greener the more of it there is. Unscored takes the neutral
 * the charts already use for "nothing to say here". Every value meets the fill contract.
 */
const scoreBandColours: Record<ScoreBand, Colour> = {
  "9–10": "#037c4c" as Colour,
  "7–8": "#188857" as Colour,
  "5–6": "#339265" as Colour,
  "3–4": "#559776" as Colour,
  "1–2": "#7d988b" as Colour,
  Unscored: NEUTRAL_FILL,
};

export const scoreBandToColour = (band: ScoreBand): Colour => scoreBandColours[band];

export const ratingToColour = ({ rating }: Movie) => ageRatingToColour(rating);

export const groupToColour = (group: MovieGroup, movie: Movie): Colour => {
  switch (group) {
    case "genre":
      // The vocabulary Shows shares, so one hue means one genre on both tabs.
      return genreToColour(movie.genre);
    case "rating":
      return ratingToColour(movie);
    case "cinema":
      return cinemaToColour(cinemaLabel(movie));
    case "decade":
      return decadeToColour(releaseDecade(movie.releaseDate.year));
    case "score":
      return scoreBandToColour(scoreBand(movie.score));
    default:
      // Franchise and director have no colour vocabulary — most films name themselves in the
      // franchise column, and directors are an open set of names with no brand to reproduce.
      // "" hands the choice to Highcharts.
      return "" as Colour;
  }
};
