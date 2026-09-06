import type { YearMonthDay } from "../common/date";
import {
  ANIME,
  animeToColour,
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
  type Certificate,
  type Colour,
  type Fill,
  type KeysMatching,
  type Scheme,
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
// `anime` is named beside the string keys, being a boolean on the model as `cinema` is.
export type MovieGroup = MovieStringKeys | "none" | "decade" | "cinema" | "score" | "anime";

export const cinemaLabel = ({ cinema }: Movie) => (cinema ? "Cinema" : "Home");

/**
 * Anime, or this tab's own word for everything else.
 *
 * The anime half is `ANIME` and not a literal, since Shows labels its own split with the same
 * constant and the box folds the two into one shelf on that string. The other half is "Film", the
 * word this tab counts in.
 */
const NOT_ANIME = "Film";

export const animeLabel = ({ anime }: { anime: boolean }) => (anime ? ANIME : NOT_ANIME);

/**
 * The split's two words in the order every surface bands them, the unmarked half first.
 *
 * Stated once beside the labelling it has to agree with: the Vitals band matches this array against
 * `animeLabel`'s output by string, and the filter's chips are the same pair, so a word changed in
 * one place and not the other silently drops a bar and a chip rather than failing to compile.
 */
export const ANIME_GROUP = [NOT_ANIME, ANIME];

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

export const certificateColour = ({ certificate }: Movie, scheme: Scheme) => certificateToColour(certificate, scheme);

export const groupToColour = (group: MovieGroup, movie: Movie, scheme: Scheme): Colour => {
  switch (group) {
    case "genre":
      // The vocabulary Shows shares, so one hue means one genre on both tabs.
      return genreToColour(movie.genre, scheme);
    case "certificate":
      return certificateColour(movie, scheme);
    case "cinema":
      return cinemaToColour(cinemaLabel(movie), scheme);
    case "anime":
      // The pair Shows splits by too, so the rose means anime on either tab.
      return animeToColour(animeLabel(movie), scheme);
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
