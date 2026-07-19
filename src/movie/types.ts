import type { YearMonthDay } from "../common/date";

export interface Movie {
  name: string;
  releaseDate: YearMonthDay;
  startDate: YearMonthDay;
  rating: number;
  score: number;
  minutes: number;
  genre: string;
  director: string;
  banner: string;
}
