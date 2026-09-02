import { describe, expect, it } from "vitest";
import { YearMonthDay, type YearNumber } from "../../src/common/date";
import { format } from "../../src/utils/mathUtils";
import {
  allTimeTotals,
  heroSeason,
  showHeroStats,
  currentlyWatching,
  groupShowsBy,
  minutesPerEpisode,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  statsCardLabelEpsHours,
  statsCardLabelRecentlyComplete,
  statsCardLabelWatching,
  watchingProgress,
  yearlyAverages,
} from "../../src/show/statsData";
import type { Season, Show } from "../../src/show/types";
import { show as buildShow } from "../fixtures/shows";

// The stats here count episodes and minutes, so they start from zero and each test adds what it
// is measuring; the shared builder carries a populated show.
const show = (overrides: Partial<Show> = {}): Show => buildShow({ e: 0, minutes: 0, ...overrides });

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

describe("statsCardLabel", () => {
  it("prints dates in the reader's voice, not the machine's", () => {
    // The thumbnail's footer and the card it opens speak one date format, so a reader is not
    // asked to translate between them on the same screen.
    const parent = show();

    expect(statsCardLabelRecentlyComplete(season(parent, { endDate: YearMonthDay.get(2022, 4, 8) }))[0][1]).toBe(
      "8 Apr 2022",
    );
  });

  it("leaves the date blank rather than printing nothing-in-particular when a season is unfinished", () => {
    expect(statsCardLabelRecentlyComplete(season(show(), { endDate: undefined }))[0][1]).toBe("");
  });

  it("floors the hours instead of rounding them, the same way every other hours figure on the tab does", () => {
    // 455 minutes is seven full hours and 35 minutes, not eight.
    const parent = show();
    expect(statsCardLabelRecentlyComplete(season(parent, { minutes: 455 }))[1][1]).toBe("7 Hours");
  });
});

describe("statsCardLabelEpsHours", () => {
  it("floors the hours from minutes, matching the recently-complete label's own floor", () => {
    expect(statsCardLabelEpsHours(withSeasons({}, { minutes: 455 }))[0][1]).toBe("7 Hours");
  });

  it("formats the episode count through the same formatter every other figure on the tab uses", () => {
    // Comparing against `format` itself rather than a literal keeps this independent of locale,
    // which AGENTS.md rules out testing directly.
    expect(statsCardLabelEpsHours(withSeasons({}, { e: 1234 }))[0][0]).toBe(`${format(1234)} Eps`);
  });
});

describe("groupShowsBy", () => {
  it("orders groups by count, most-watched first", () => {
    const data = [
      show({ genre: "Drama" }),
      show({ name: "Andor", genre: "Drama" }),
      show({ name: "Alien", genre: "Horror" }),
    ];

    expect(groupShowsBy(data, "genre", "Shows").map((g) => g.name)).toEqual(["Drama", "Horror"]);
  });

  it("counts Hours as the floor of the group's total minutes over sixty", () => {
    const data = [show({ genre: "Drama", minutes: 90 }), show({ name: "Andor", genre: "Drama", minutes: 90 })];

    expect(groupShowsBy(data, "genre", "Hours")[0].count).toBe(3);
  });

  it("counts Episodes as the group's summed episode total", () => {
    const data = [show({ genre: "Drama", e: 9 }), show({ name: "Andor", genre: "Drama", e: 12 })];

    expect(groupShowsBy(data, "genre", "Episodes")[0].count).toBe(21);
  });

  it("counts Shows as the number of shows in the group", () => {
    const data = [
      show({ genre: "Drama" }),
      show({ name: "Andor", genre: "Drama" }),
      show({ name: "Alien", genre: "Horror" }),
    ];

    expect(groupShowsBy(data, "genre", "Shows")[0].count).toBe(2);
  });

  it("picks the show with the most minutes as the group's artwork", () => {
    const data = [show({ genre: "Drama", minutes: 100 }), show({ name: "Andor", genre: "Drama", minutes: 500 })];

    expect(groupShowsBy(data, "genre", "Shows")[0].top.name).toBe("Andor");
  });

  it("drops franchise groups of one show — a standalone naming itself is not a series", () => {
    // 229 of 308 shows carry their own name in the franchise column, so grouping by franchise
    // without this would turn most of the library into franchises of one. The test is the
    // group's size, not the name: a series' first show genuinely shares the franchise's name.
    const data = [
      show({ name: "Severance", franchise: "Severance" }),
      show({ name: "The Boys", franchise: "The Boys" }),
      show({ name: "Gen V", franchise: "The Boys" }),
    ];

    const groups = groupShowsBy(data, "franchise", "Shows");
    expect(groups.map((g) => g.name)).toEqual(["The Boys"]);
    // The self-named first entry stays in its series rather than being read as a standalone.
    expect(groups[0].all.map((s) => s.name)).toEqual(["The Boys", "Gen V"]);
  });

  it("drops a franchise seen only once, even when the show does not name itself", () => {
    const data = [show({ name: "The Mandalorian", franchise: "Star Wars" })];

    expect(groupShowsBy(data, "franchise", "Shows")).toEqual([]);
  });

  it("groups a real franchise across the shows that share it", () => {
    const data = [
      show({ name: "A New Hope", franchise: "Star Wars" }),
      show({ name: "The Mandalorian", franchise: "Star Wars" }),
    ];

    expect(groupShowsBy(data, "franchise", "Shows")[0]).toMatchObject({ name: "Star Wars", count: 2 });
  });

  it("title-cases the type group names through typeToName", () => {
    const data = [show({ type: "anime" }), show({ name: "Andor", type: "show" })];

    expect(
      groupShowsBy(data, "type", "Shows")
        .map((g) => g.name)
        .toSorted(),
    ).toEqual(["Anime", "Show"]);
  });
});

describe("watchingProgress", () => {
  it("returns hours undefined when the season has no recorded runtime", () => {
    const today = YearMonthDay.get(2022, 3, 1);

    expect(watchingProgress(season(show(), { minutes: 0 }), today).hours).toBeUndefined();
  });

  it("floors hours from minutes when the season has a runtime", () => {
    const today = YearMonthDay.get(2022, 3, 1);

    expect(watchingProgress(season(show(), { minutes: 130 }), today).hours).toBe(2);
  });

  it("leaves days undefined instead of calling the backwards comparison daysTo throws on", () => {
    // A season logged with a future start date should not crash the card it feeds.
    const today = YearMonthDay.get(2022, 1, 1);
    const notYetStarted = season(show(), { startDate: YearMonthDay.get(2022, 4, 1) });

    expect(() => watchingProgress(notYetStarted, today)).not.toThrow();
    expect(watchingProgress(notYetStarted, today).days).toBeUndefined();
  });

  it("counts the days elapsed since the season started, the start day itself included", () => {
    const today = YearMonthDay.get(2022, 1, 10);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1) });

    expect(watchingProgress(s, today).days).toBe(10);
  });

  it("leaves the pace undefined under a week of watching, since it would be a projection rather than a rate", () => {
    const today = YearMonthDay.get(2022, 1, 3);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1) });

    expect(watchingProgress(s, today).perWeek).toBeUndefined();
  });

  it("rounds the weekly pace to one decimal place", () => {
    const today = YearMonthDay.get(2022, 1, 28);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), e: 14 });

    // 14 episodes over 28 days is exactly 3.5 a week.
    expect(watchingProgress(s, today).perWeek).toBe(3.5);
  });
});

describe("minutesPerEpisode", () => {
  it("weights by episode count rather than averaging the per-season lengths", () => {
    // A season with more episodes should count proportionally more toward the average: a naive
    // average of 30 and 120 minutes-per-episode would be 75, not the 34 this weights to.
    const data = [withSeasons({}, { e: 20, minutes: 600 }), withSeasons({ name: "Andor" }, { e: 1, minutes: 120 })];

    expect(minutesPerEpisode(data)).toBe(34);
  });

  it("returns zero when nothing has been watched, rather than dividing by zero", () => {
    expect(minutesPerEpisode([show({ name: "Empty" })])).toBe(0);
  });
});

describe("statsCardLabelWatching", () => {
  it("prints the start date and days-in on the first row, episodes and pace on the second", () => {
    const today = YearMonthDay.get(2022, 1, 28);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), e: 14, minutes: 0 });

    expect(statsCardLabelWatching(s, today)).toEqual([
      ["1 Jan 2022", "28 days in"],
      ["14 eps", "3.5/wk"],
    ]);
  });

  it("leaves the days-in cell blank when the season has not started yet", () => {
    const today = YearMonthDay.get(2022, 1, 1);
    const notYetStarted = season(show(), { startDate: YearMonthDay.get(2022, 4, 1) });

    expect(statsCardLabelWatching(notYetStarted, today)[0][1]).toBe("");
  });

  it("leaves the pace cell blank when fewer than a week has passed", () => {
    const today = YearMonthDay.get(2022, 1, 3);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1) });

    expect(statsCardLabelWatching(s, today)[1][1]).toBe("");
  });
});

describe("heroSeason", () => {
  const watchingSeason = (name: string, lastWatched?: YearMonthDay) => {
    const parent = show({ name, lastWatchedDate: lastWatched });
    parent.s = [season(parent, { startDate: YearMonthDay.get(2026, 1, 5) })];
    return parent.s[0];
  };

  it("picks the season whose show the Last Watched column marks as most recent", () => {
    const older = watchingSeason("The Expanse", YearMonthDay.get(2026, 8, 1));
    const newer = watchingSeason("Severance", YearMonthDay.get(2026, 8, 28));

    expect(heroSeason([older, newer])).toBe(newer);
    expect(heroSeason([newer, older])).toBe(newer);
  });

  it("ignores watching shows the column does not mark", () => {
    const unmarked = watchingSeason("One Piece");
    const marked = watchingSeason("Severance", YearMonthDay.get(2026, 8, 28));

    expect(heroSeason([unmarked, marked])).toBe(marked);
  });

  it("elects nobody when no watching show carries the column, rather than inventing a tie-break", () => {
    // The sheet may predate the column entirely; the page then keeps the plain strip.
    expect(heroSeason([watchingSeason("A"), watchingSeason("B")])).toBeUndefined();
  });
});

describe("showHeroStats", () => {
  const today = YearMonthDay.get(2026, 2, 2);
  const heroOf = (franchiseCount: number) => {
    const parent = show({ franchise: "Star Trek" });
    parent.s = [season(parent, { startDate: YearMonthDay.get(2026, 1, 5), e: 8 })];
    return showHeroStats(parent.s[0], franchiseCount, today);
  };

  it("carries the strip's own honest figures at tile size: episodes, days in, pace", () => {
    const labels = heroOf(1).map((stat) => stat.label);

    expect(labels).toEqual(["Episodes", "Days In", "Eps / Week"]);
  });

  it("adds a franchise tile only where there is a series to count", () => {
    expect(heroOf(3).at(-1)).toEqual({ label: "Star Trek Shows", value: 3 });
    expect(heroOf(1).map((stat) => stat.label)).not.toContain("Star Trek Shows");
  });
});
