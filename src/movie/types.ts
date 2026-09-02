import type { YearMonthDay } from "../common/date";
import {
  ageRatingToColour,
  decadeToColour,
  franchiseToColour,
  genreToColour,
  fill,
  NEUTRAL_FILL,
  pick,
  releaseDecade,
  type AgeRating,
  type Colour,
  type Fill,
  type KeysMatching,
  type Scheme,
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

type MovieStringKeys = KeysMatching<Movie, string>;

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
const cinemaColours: Record<"Cinema" | "Home", Fill> = {
  // The outing takes the marquee gold; the sofa a settled slate blue. Both meet the fill contract.
  Cinema: fill("#b57800", "#ec9e00"),
  Home: fill("#0e6ab4", "#3789d5"),
};

export const cinemaToColour = (label: string, scheme: Scheme): Colour =>
  pick(cinemaColours[label as "Cinema" | "Home"] ?? NEUTRAL_FILL, scheme);

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
 * Red through amber to green, because a score is valenced and not merely ordered — a 2 is a
 * different judgement from an 8, and hue is what can say so. Hue has to carry the scale anyway:
 * the fill contract confines every value to one narrow lightness band, so a single-hue ramp only
 * has five near-identical steps to give, and its palest step lands a hair from the neutral that
 * means Unscored. Lightness arches — dark at both poles, lightest at the amber middle — so
 * neighbouring bands separate by brightness as well as hue. The middle amber sits a step lighter
 * and yellower than the Cinema gold in the band below it. Every value meets the fill contract.
 */
const scoreBandColours: Record<ScoreBand, Fill> = {
  "9–10": fill("#007338", "#04ab57"),
  "7–8": fill("#298d00", "#63c94a"),
  "5–6": fill("#ac8b00", "#f8cc20"),
  "3–4": fill("#b65800", "#ea7300"),
  "1–2": fill("#af0025", "#de1e39"),
  Unscored: NEUTRAL_FILL,
};

export const scoreBandToColour = (band: ScoreBand, scheme: Scheme): Colour => pick(scoreBandColours[band], scheme);

export const ratingToColour = ({ rating }: Movie, scheme: Scheme) => ageRatingToColour(rating, scheme);

export const groupToColour = (group: MovieGroup, movie: Movie, scheme: Scheme): Colour => {
  switch (group) {
    case "genre":
      // The vocabulary Shows shares, so one hue means one genre on both tabs.
      return genreToColour(movie.genre, scheme);
    case "rating":
      return ratingToColour(movie, scheme);
    case "cinema":
      return cinemaToColour(cinemaLabel(movie), scheme);
    case "decade":
      return decadeToColour(releaseDecade(movie.releaseDate.year), scheme);
    case "score":
      return scoreBandToColour(scoreBand(movie.score), scheme);
    case "franchise":
      // The table `utils/types.ts` shares with Games and Shows, so Marvel is one colour on all
      // three. Most films name themselves in this column and take the empty answer.
      return franchiseToColour(movie, scheme);
    default:
      // A director is an open set of names with no brand to reproduce, so "" hands the choice to
      // Highcharts.
      return "" as Colour;
  }
};
