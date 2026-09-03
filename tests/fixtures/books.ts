import { YearMonthDay } from "../../src/common/date";
import type { Book } from "../../src/books/types";

/**
 * A whole `Book`, as the converter would have built it, for tests that start from the model
 * rather than from sheet rows.
 *
 * One builder rather than one per test file: every field on `Book` but the optional four is
 * required, so a field added to the model breaks each copy of this at once, and several copies
 * drift into disagreeing about what a default book looks like.
 */
export const book = (overrides: Partial<Book> = {}): Book => ({
  name: "Chasm City",
  author: "Alastair Reynolds",
  franchise: "Revelation Space",
  series: "Revelation Space",
  seriesNumber: 2,
  genre: "Sci-Fi",
  status: "Finished",
  format: "eBook",
  score: 8,
  releaseDate: YearMonthDay.get(2001, 5, 1),
  startDate: YearMonthDay.get(2026, 3, 15),
  endDate: YearMonthDay.get(2026, 3, 27),
  numDays: 13,
  pages: 694,
  hours: 12.4,
  banner: "https://assets.hardcover.app/external_data/1/chasm-city.jpeg",
  ...overrides,
});
