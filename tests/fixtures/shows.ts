import { YearMonthDay } from "../../src/common/date";
import type { Show } from "../../src/show/types";

/**
 * A whole `Show`, as the converter would have built it, for tests that start from the model
 * rather than from sheet rows.
 *
 * One builder rather than one per test file: every field on `Show` is required apart from the end
 * date, so a field added to the model breaks each copy of this at once, and three copies drift
 * into disagreeing about what a default show looks like.
 */
export const show = (overrides: Partial<Show> = {}): Show => ({
  name: "Severance",
  status: "Watching",
  startDate: YearMonthDay.get(2022, 2, 18),
  type: "show",
  genre: "Sci-Fi",
  genres: ["Drama", "Thriller"],
  network: "Apple TV+",
  rating: "15",
  franchise: "Severance",
  banner: "severance.jpg",
  s: [],
  e: 9,
  minutes: 405,
  ...overrides,
});
