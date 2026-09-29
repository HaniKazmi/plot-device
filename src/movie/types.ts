import type { YearMonthDay } from "../common/date";
import {
  certificateToColour,
  decadeToColour,
  franchiseToColour,
  genreToColour,
  fill,
  NEUTRAL_FILL,
  pick,
  releaseDecade,
  scoreBand,
  scoreBandToColour,
  styleToColour,
  type Certificate,
  type Colour,
  type Fill,
  type KeysMatching,
  type Scheme,
  type Style,
} from "../utils/types";

export interface Movie {
  name: string;
  releaseDate: YearMonthDay;
  startDate: YearMonthDay;
  certificate: Certificate;
  /** Absent for the handful of films never scored, which is not the same as scoring one zero. */
  score?: number;
  minutes: number;
  genre: string;
  /**
   * The sheet lists these in one cell and never repeats `genre` among them, so the two fields
   * together are the film's full set rather than an overlapping pair. Empty where the sheet says
   * nothing.
   */
  otherGenres: string[];
  /** A film with no wider franchise carries its own name here. */
  franchise: string;
  /**
   * The series inside the franchise, or `""` where the film stands alone — blank rather than the
   * film's own name, as `Book.series` is and unlike `franchise` above.
   */
  series: string;
  /** Its place in `series`, absent for a standalone or an entry the sheet does not number. */
  seriesNumber?: number;
  director: string;
  artwork: string;
  /** Whether it was seen in a cinema rather than at home. */
  cinema: boolean;
  /** How the film looks, in the vocabulary Games and Shows share (`STYLES`). */
  style: Style;
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

/**
 * When a film was finished: the day it was watched, a film being finished the day it is started —
 * the close the library shelves it under and the union dates it by.
 */
export const watchedOn = (film: Movie) => film.startDate;

export const cinemaLabel = ({ cinema }: Movie) => (cinema ? "Cinema" : "Home");

/** Exhaustive over the two values `cinemaLabel` can answer, so both always have a fill. */
const cinemaColours: Record<"Cinema" | "Home", Fill> = {
  // The outing takes the marquee gold; the sofa a settled slate blue. Both meet the fill contract.
  Cinema: fill("#b57800", "#ec9e00"),
  Home: fill("#0e6ab4", "#3789d5"),
};

export const cinemaToColour = (label: string, scheme: Scheme): Colour =>
  pick(cinemaColours[label as "Cinema" | "Home"] ?? NEUTRAL_FILL, scheme);

/**
 * The score vocabulary lives in the shared layer, because Books scores on the same scale and a
 * tracked domain may not import another's; it is re-exported here so this tab's callers name it
 * as their own.
 */
export { scoreBands, scoreBand, scoreBandToColour, type ScoreBand } from "../utils/types";

const certificateColour = ({ certificate }: Movie, scheme: Scheme) => certificateToColour(certificate, scheme);

export const groupToColour = (group: MovieGroup, movie: Movie, scheme: Scheme): Colour => {
  switch (group) {
    case "genre":
      // The vocabulary Shows shares, so one hue means one genre on both tabs.
      return genreToColour(movie.genre, scheme);
    case "certificate":
      return certificateColour(movie, scheme);
    case "cinema":
      return cinemaToColour(cinemaLabel(movie), scheme);
    case "style":
      // The vocabulary Games and Shows share, so the rose means anime on every tab.
      return styleToColour(movie.style, scheme);
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
