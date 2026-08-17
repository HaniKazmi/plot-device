import { describe, expect, it } from "vitest";
import { YearMonthDay, type YearNumber } from "../../src/common/date";
import {
  allTimeTotals,
  currentlyWatching,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  yearlyAverages,
} from "../../src/show/statsData";
import type { Season, Show } from "../../src/show/types";

const show = (overrides: Partial<Show> = {}): Show => ({
  name: "Severance",
  status: "Watching",
  startDate: YearMonthDay.get(2022, 2, 18),
  anime: false,
  s: [],
  e: 0,
  minutes: 0,
  ...overrides,
});

const season = (parent: Show, overrides: Partial<Season> = {}): Season => ({
  s: 1,
  e: 9,
  startDate: YearMonthDay.get(2022, 2, 18),
  endDate: YearMonthDay.get(2022, 4, 8),
  episodeLength: 45,
  minutes: 405,
  show: parent,
  ...overrides,
});

/** A show with its seasons attached, as the converter produces it. */
const withSeasons = (overrides: Partial<Show>, ...seasons: Partial<Season>[]): Show => {
  const parent = show(overrides);
  parent.s = seasons.map((s) => season(parent, s));
  parent.e = parent.s.reduce((a, b) => a + b.e, 0);
  parent.minutes = parent.s.reduce((a, b) => a + b.minutes, 0);
  return parent;
};

describe("allTimeTotals", () => {
  it("counts shows and sums the rolled-up episode and minute totals", () => {
    const data = [withSeasons({}, { e: 9, minutes: 405 }), withSeasons({ name: "Andor" }, { e: 12, minutes: 480 })];

    expect(allTimeTotals(data)).toEqual({ shows: 2, episodes: 21, hours: 14 });
  });

  it("floors the hours rather than rounding them up", () => {
    // 119 minutes is one hour of watching, not two.
    expect(allTimeTotals([withSeasons({}, { minutes: 119 })]).hours).toBe(1);
  });

  it("returns zeroes for empty data", () => {
    expect(allTimeTotals([])).toEqual({ shows: 0, episodes: 0, hours: 0 });
  });
});

describe("seasonsInYear", () => {
  const data = [
    withSeasons(
      {},
      { startDate: YearMonthDay.get(2022, 2, 18), e: 9, minutes: 405 },
      { startDate: YearMonthDay.get(2025, 1, 17), e: 10, minutes: 500 },
    ),
  ];

  it("counts only the seasons that started in the year asked for", () => {
    expect(seasonsInYear(data, 2022 as YearNumber)).toEqual({ seasons: 1, episodes: 9, hours: 6 });
  });

  it("takes the year as an argument rather than reading the clock", () => {
    // Anything derived from the current year would change meaning every January.
    expect(seasonsInYear(data, 2025 as YearNumber).seasons).toBe(1);
    expect(seasonsInYear(data, 2023 as YearNumber).seasons).toBe(0);
  });

  it("returns zeroes for a year with nothing in it", () => {
    expect(seasonsInYear(data, 1999 as YearNumber)).toEqual({ seasons: 0, episodes: 0, hours: 0 });
  });
});

describe("yearlyAverages", () => {
  it("averages seasons, episodes and hours over the years that have data", () => {
    const data = [
      withSeasons(
        {},
        { startDate: YearMonthDay.get(2022, 1, 1), e: 10, minutes: 600 },
        { startDate: YearMonthDay.get(2022, 6, 1), e: 10, minutes: 600 },
        { startDate: YearMonthDay.get(2023, 1, 1), e: 20, minutes: 1200 },
      ),
    ];

    expect(yearlyAverages(data)).toEqual({ seasons: 1, episodes: 20, hours: 20 });
  });

  it("skips seasons with no recorded runtime entirely", () => {
    // A season with no runtime contributes neither its episodes nor its existence.
    const data = [
      withSeasons(
        {},
        { startDate: YearMonthDay.get(2022, 1, 1), e: 10, minutes: 600 },
        { startDate: YearMonthDay.get(2023, 1, 1), e: 99, minutes: 0 },
      ),
    ];

    expect(yearlyAverages(data)).toEqual({ seasons: 1, episodes: 10, hours: 10 });
  });

  it("floors the average rather than rounding it, unlike the games tab", () => {
    // vg/statsData's yearlyAverages keeps two decimals; this one truncates. The two domains
    // disagree, and the difference is visible on screen.
    const data = [
      withSeasons(
        {},
        { startDate: YearMonthDay.get(2022, 1, 1), e: 10, minutes: 600 },
        { startDate: YearMonthDay.get(2022, 2, 1), e: 10, minutes: 600 },
        { startDate: YearMonthDay.get(2023, 1, 1), e: 10, minutes: 600 },
      ),
    ];

    expect(yearlyAverages(data).seasons).toBe(1);
  });

  it("converts to hours after averaging, so it floors once at the end", () => {
    const data = [withSeasons({}, { startDate: YearMonthDay.get(2022, 1, 1), minutes: 90, e: 1 })];

    expect(yearlyAverages(data).hours).toBe(1);
  });

  it("yields NaN for empty data, because the year count is the divisor", () => {
    expect(yearlyAverages([]).seasons).toBeNaN();
  });
});

describe("perShowAverages", () => {
  it("divides season totals across every show", () => {
    const data = [
      withSeasons({}, { e: 10, minutes: 600 }, { e: 10, minutes: 600 }),
      withSeasons({ name: "Andor" }, { e: 20, minutes: 1200 }),
    ];

    expect(perShowAverages(data)).toEqual({ seasons: 2, episodes: 20, hours: 20 });
  });

  it("divides by the show count, not the season count", () => {
    const data = [withSeasons({}, { e: 10, minutes: 600 }, { e: 10, minutes: 600 })];

    expect(perShowAverages(data).episodes).toBe(20);
  });

  it("counts a show with no seasons in the divisor, dragging every average down", () => {
    const data = [withSeasons({}, { e: 10, minutes: 600 }), show({ name: "Empty" })];

    expect(perShowAverages(data).episodes).toBe(5);
  });

  it("rounds seasons and episodes but floors hours", () => {
    // The inconsistency is real: 1.5 seasons rounds up to 2 while 1.5 hours floors to 1.
    const data = [withSeasons({}, { e: 3, minutes: 90 }), show({ name: "Empty" })];

    expect(perShowAverages(data)).toEqual({ seasons: 1, episodes: 2, hours: 0 });
  });

  it("yields NaN for empty data", () => {
    expect(perShowAverages([]).seasons).toBeNaN();
  });
});

describe("recentlyComplete", () => {
  it("returns finished seasons newest first", () => {
    const data = [
      withSeasons(
        {},
        { s: 1, endDate: YearMonthDay.get(2022, 4, 8) },
        { s: 2, endDate: YearMonthDay.get(2025, 3, 21) },
      ),
    ];

    expect(recentlyComplete(data).map((s) => s.s)).toEqual([2, 1]);
  });

  it("omits seasons still airing", () => {
    const data = [withSeasons({}, { s: 1, endDate: undefined }, { s: 2, endDate: YearMonthDay.get(2025, 3, 21) })];

    expect(recentlyComplete(data).map((s) => s.s)).toEqual([2]);
  });

  it("returns every finished season, leaving the cap to the card that renders them", () => {
    const data = [withSeasons({}, ...Array.from({ length: 25 }, (_, i) => ({ s: i })))];

    expect(recentlyComplete(data)).toHaveLength(25);
  });
});

describe("currentlyWatching", () => {
  it("returns the latest season of each show still being watched", () => {
    const data = [
      withSeasons(
        { status: "Watching" },
        { s: 1, endDate: YearMonthDay.get(2022, 4, 8) },
        { s: 2, endDate: undefined },
      ),
    ];

    expect(currentlyWatching(data).map((s) => s.s)).toEqual([2]);
  });

  it("ignores shows that are not being watched", () => {
    const data = [withSeasons({ status: "Ended" }, { s: 1, endDate: undefined })];

    expect(currentlyWatching(data)).toEqual([]);
  });

  it("drops a watched show whose latest season has already finished", () => {
    const data = [withSeasons({ status: "Watching" }, { s: 1, endDate: YearMonthDay.get(2022, 4, 8) })];

    expect(currentlyWatching(data)).toEqual([]);
  });

  it("orders by start date newest first, since sortByKey defaults to descending", () => {
    const data = [
      withSeasons({ status: "Watching" }, { s: 1, startDate: YearMonthDay.get(2025, 1, 1), endDate: undefined }),
      withSeasons(
        { name: "Andor", status: "Watching" },
        {
          s: 1,
          startDate: YearMonthDay.get(2022, 1, 1),
          endDate: undefined,
        },
      ),
    ];

    expect(currentlyWatching(data).map((s) => s.show.name)).toEqual(["Severance", "Andor"]);
  });

  it("throws by name when a watched show has no seasons at all", () => {
    // A spreadsheet error rather than something to render around, so it stays a hard failure —
    // but names the show instead of failing somewhere inside the card grid.
    expect(() => currentlyWatching([show({ name: "Lost", status: "Watching" })])).toThrow(
      'Show "Lost": is marked Watching but has no seasons',
    );
  });

  it("returns nothing for empty data", () => {
    expect(currentlyWatching([])).toEqual([]);
  });
});
