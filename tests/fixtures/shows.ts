import { YearMonthDay } from "../../src/common/date";
import type { Season, Show } from "../../src/show/types";

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

/**
 * A season of `parent`, numbered after whatever the parent already holds. The back-reference is
 * set here and not overridable, since a season pointing at a different show than the list it sits
 * in is a state the converter can never produce.
 */
export const season = (parent: Show, overrides: Partial<Omit<Season, "show">> = {}): Season => ({
  s: parent.s.length + 1,
  e: 9,
  startDate: parent.startDate,
  episodeLength: 45,
  minutes: 405,
  ...overrides,
  show: parent,
});

/** A show whose seasons started in the given years — the shape the year filter reads. */
export const showWithSeasonsIn = (...years: number[]): Show => {
  const parent = show({ startDate: YearMonthDay.get(years[0], 2, 18) });
  parent.s = years.map((year, i) => season(parent, { startDate: YearMonthDay.get(year, 2, 18), s: i + 1 }));
  return parent;
};
