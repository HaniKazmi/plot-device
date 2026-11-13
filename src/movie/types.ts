import type { YearMonthDay } from "../common/date";
import type { InSeries } from "../common/series";
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

export interface Movie extends InSeries {
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
  director: string;
  artwork: string;
  /** Where it was seen: an outing to a cinema or a theatre, or a night in. */
  venue: Venue;
  /** How the film looks, in the vocabulary Games and Shows share (`STYLES`). */
  style: Style;
}

type MovieStringKeys = KeysMatching<Movie, string>;

export type Measure = "Films" | "Hours";

/**
 * What the charts can group by: the string fields plus two derivations — the release decade and
 * the score band. The union is the option set rather than `keyof Movie` because those two live on
 * no field; "score" here means the band, since a select box shows these words and "scoreBand" is
 * nobody's vocabulary.
 */
export type MovieGroup = MovieStringKeys | "none" | "decade" | "score";

/**
 * When a film was finished: the day it was watched, a film being finished the day it is started —
 * the close the library shelves it under and the union dates it by.
 */
export const watchedOn = (film: Movie) => film.startDate;

/**
 * Where a film was seen, as the sheet's Format column words it: the two outings, then the night in.
 * A stage production is tracked here beside the films because it is the same shape of record — one
 * sitting on one day, a runtime, a score, a director and a franchise it can join across media.
 */
export const VENUES = ["Cinema", "Theatre", "Home"] as const;
export type Venue = (typeof VENUES)[number];

/**
 * Exhaustive over `VENUES`, so every venue has a fill. The outing to a cinema takes the marquee
 * gold and the sofa a settled slate blue. A theatre's own colour is its curtain's crimson, which is
 * the 1–2 score band's on the Vitals card the venue band shares, 5.6 dE (CIEDE2000) away on white;
 * it takes the velvet violet instead, at least 18.5 from every other venue, style and score fill on
 * either paper. Its nearest neighbours are two genres, Thriller at 8.0 on white and Fantasy at 9.7 on
 * the dark paper: the two meet on a film's subtitle and the filter surface, each of which words both
 * values, and never as fills on one chart. All three meet the fill contract.
 */
const venueColours: Record<Venue, Fill> = {
  Cinema: fill("#b57800", "#ec9e00"),
  Theatre: fill("#7b3fc4", "#a678f0"),
  Home: fill("#0e6ab4", "#3789d5"),
};

export const venueToColour = (label: string, scheme: Scheme): Colour =>
  pick(venueColours[label as Venue] ?? NEUTRAL_FILL, scheme);

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
    case "venue":
      return venueToColour(movie.venue, scheme);
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
