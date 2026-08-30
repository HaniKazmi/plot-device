import type { YearMonthDay } from "../common/date";
import type { AgeRating } from "../utils/types";

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
}
