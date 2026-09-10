import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, type YearNumber } from "../../src/common/date";
import { format } from "../../src/utils/mathUtils";
import {
  allTimeTotals,
  earliestYear,
  heroSeason,
  showHeroStats,
  currentlyWatching,
  groupShowsBy,
  measureOf,
  minutesPerEpisode,
  perShowAverages,
  recentlyWatched,
  seasonsInYear,
  statsCardLabelEpsHours,
  statsCardLabelRecentlyWatched,
  statsCardLabelWatching,
  watchingProgress,
  yearlyAverages,
} from "../../src/show/statsData";
import type { Season, Show } from "../../src/show/types";
import { show as buildShow } from "../fixtures/shows";

// The stats here count episodes and minutes, so they start from zero and each test adds what it
// is measuring; the shared builder carries a populated show.
const show = (overrides: Partial<Show> = {}): Show => buildShow({ e: 0, minutes: 0, ...overrides });

const season = (parent: Show, overrides: Partial<Season> = {}): Season => {
  const built = {
    s: 1,
    e: 9,
    startDate: YearMonthDay.get(2022, 2, 18),
    endDate: YearMonthDay.get(2022, 4, 8),
    episodeLength: 45,
    minutes: 405,
    show: parent,
    ...overrides,
  };

  // Derived as the converter derives it, so a fixture cannot build a finished season carrying no
  // last watch — a record no sheet produces, and one every order over these seasons files under
  // "undated" where a real row sorts by its date.
  return { ...built, lastWatchedDate: built.endDate ?? built.lastWatchedDate };
};

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
    // game/statsData's yearlyAverages keeps two decimals; this one truncates. The two domains
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

  it("averages to 0 over no active year, so the card draws a figure and not NaN", () => {
    expect(yearlyAverages([]).seasons).toBe(0);
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

describe("recentlyWatched", () => {
  it("returns finished seasons newest first", () => {
    const data = [
      withSeasons(
        {},
        { s: 1, endDate: YearMonthDay.get(2022, 4, 8) },
        { s: 2, endDate: YearMonthDay.get(2025, 3, 21) },
      ),
    ];

    expect(recentlyWatched(data).map((s) => s.s)).toEqual([2, 1]);
  });

  it("omits seasons still airing", () => {
    const data = [withSeasons({}, { s: 1, endDate: undefined }, { s: 2, endDate: YearMonthDay.get(2025, 3, 21) })];

    expect(recentlyWatched(data).map((s) => s.s)).toEqual([2]);
  });

  it("returns every finished season, leaving the cap to the card that renders them", () => {
    const data = [withSeasons({}, ...Array.from({ length: 25 }, (_, i) => ({ s: i })))];

    expect(recentlyWatched(data)).toHaveLength(25);
  });
});

describe("currentlyWatching", () => {
  it("returns the seasons the sheet has left open", () => {
    const data = [
      withSeasons(
        {},
        { s: 1, endDate: YearMonthDay.get(2022, 4, 8) },
        { s: 2, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 28) },
      ),
    ];

    expect(currentlyWatching(data).map((s) => s.s)).toEqual([2]);
  });

  it("drops a show marked Watching whose latest season has closed", () => {
    // A status is what the reader has decided about the show's future; it says nothing about
    // whether a season is in hand, and a closed season is in hand no longer.
    const data = [withSeasons({ status: "Watching" }, { s: 1, endDate: YearMonthDay.get(2022, 4, 8) })];

    expect(currentlyWatching(data)).toEqual([]);
  });

  it("keeps an open season whatever its show's status says", () => {
    // The End Date column is the whole test. A season left open under a status saying the show is
    // done with is a row the sheet has not closed, and the strip is where that is visible.
    const data = [
      withSeasons({ status: "Ended" }, { s: 1, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 1) }),
    ];

    expect(currentlyWatching(data).map((s) => s.show.status)).toEqual(["Ended"]);
  });

  it("returns both seasons where one show has two open at once", () => {
    // Per season and not per show: the list is what is in hand, and two rows the sheet has left
    // open are two things in hand.
    const data = [
      withSeasons(
        {},
        { s: 1, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 1) },
        { s: 2, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 28) },
      ),
    ];

    expect(currentlyWatching(data).map((s) => s.s)).toEqual([2, 1]);
  });

  it("orders by the season's own last watch, newest first", () => {
    const data = [
      withSeasons({ name: "Andor" }, { s: 1, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 1) }),
      withSeasons({}, { s: 1, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 28) }),
    ];

    expect(currentlyWatching(data).map((s) => s.show.name)).toEqual(["Severance", "Andor"]);
  });

  it("puts a season the sheet dates neither way after every dated one, however old that date is", () => {
    const data = [
      withSeasons({ name: "One Piece" }, { s: 1, endDate: undefined }),
      withSeasons({}, { s: 1, endDate: undefined, lastWatchedDate: YearMonthDay.get(2020, 1, 1) }),
    ];

    expect(currentlyWatching(data).map((s) => s.show.name)).toEqual(["Severance", "One Piece"]);
  });

  it("leaves the undated tail in the order the sheet lists those shows", () => {
    // Two undated seasons compare equal in both directions, or the tail's order depends on which
    // way round the sort happened to reach them. Start dates are not a tie-break: a season begun
    // later is not one watched later.
    const data = [
      withSeasons({ name: "One Piece" }, { s: 1, startDate: YearMonthDay.get(2022, 1, 1), endDate: undefined }),
      withSeasons({}, { s: 1, startDate: YearMonthDay.get(2025, 1, 1), endDate: undefined }),
    ];

    expect(currentlyWatching(data).map((s) => s.show.name)).toEqual(["One Piece", "Severance"]);
    expect(currentlyWatching(data.toReversed()).map((s) => s.show.name)).toEqual(["Severance", "One Piece"]);
  });

  it("returns nothing for empty data", () => {
    expect(currentlyWatching([])).toEqual([]);
  });

  it("partitions the library with recentlyWatched, every season in exactly one", () => {
    // The two lists are read as one answer — what is in hand, and what has closed — so a season
    // reaching both would be counted twice and one reaching neither would be off the page.
    const data = [
      withSeasons(
        {},
        { s: 1, endDate: YearMonthDay.get(2022, 4, 8) },
        { s: 2, endDate: undefined, lastWatchedDate: YearMonthDay.get(2026, 8, 28) },
      ),
      withSeasons({ name: "Andor", status: "Ended" }, { s: 1, endDate: undefined }, { s: 2, endDate: undefined }),
      withSeasons({ name: "Veep", status: "Cancelled" }, { s: 1, endDate: YearMonthDay.get(2019, 5, 12) }),
    ];
    const seasons = data.flatMap((show) => show.s);

    const open = currentlyWatching(data);
    const closed = recentlyWatched(data);

    expect(seasons.filter((season) => open.includes(season) !== closed.includes(season))).toHaveLength(seasons.length);
    expect(open.length + closed.length).toBe(seasons.length);
  });
});

describe("statsCardLabel", () => {
  it("prints dates in the reader's voice, not the machine's", () => {
    // The thumbnail's footer and the card it opens speak one date format, so a reader is not
    // asked to translate between them on the same screen.
    const parent = show();

    expect(statsCardLabelRecentlyWatched(season(parent, { endDate: YearMonthDay.get(2022, 4, 8) }))[0][1]).toBe(
      "8 Apr 2022",
    );
  });

  it("leaves the date blank rather than printing nothing-in-particular when a season is unfinished", () => {
    expect(statsCardLabelRecentlyWatched(season(show(), { endDate: undefined }))[0][1]).toBe("");
  });

  it("floors the hours instead of rounding them, the same way every other hours figure on the tab does", () => {
    // 455 minutes is seven full hours and 35 minutes, not eight.
    const parent = show();
    expect(statsCardLabelRecentlyWatched(season(parent, { minutes: 455 }))[1][1]).toBe("7 Hours");
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

  it("words the anime split through animeLabel, the boolean being no label of its own", () => {
    const data = [show({ anime: true }), show({ name: "Andor", anime: false })];

    expect(
      groupShowsBy(data, "anime", "Shows")
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
    const notYetStarted = season(show(), { startDate: YearMonthDay.get(2022, 4, 1), endDate: undefined });

    expect(() => watchingProgress(notYetStarted, today)).not.toThrow();
    expect(watchingProgress(notYetStarted, today).days).toBeUndefined();
  });

  it("counts the days elapsed since the season started, the start day itself included", () => {
    const today = YearMonthDay.get(2022, 1, 10);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), endDate: undefined });

    expect(watchingProgress(s, today).days).toBe(10);
  });

  it("leaves days undefined for a season the sheet typed backwards, rather than throwing mid-render", () => {
    // The converter only reports an end before its own start, and lets the row through, so a
    // transposed pair reaches here — where a bare `daysTo` throws and takes the page with it.
    const today = YearMonthDay.get(2026, 1, 1);
    const transposed = season(show(), {
      startDate: YearMonthDay.get(2022, 4, 8),
      endDate: YearMonthDay.get(2022, 1, 1),
    });

    expect(() => watchingProgress(transposed, today)).not.toThrow();
    expect(watchingProgress(transposed, today).days).toBeUndefined();
    expect(watchingProgress(transposed, today).perWeek).toBeUndefined();
  });

  it("measures a finished season to its own end, not to today", () => {
    // Read to today, a finished season's day count climbs and its pace falls for as long as the
    // row is in the library.
    const today = YearMonthDay.get(2026, 1, 1);
    const s = season(show(), {
      startDate: YearMonthDay.get(2022, 1, 1),
      endDate: YearMonthDay.get(2022, 1, 28),
      e: 14,
    });

    expect(watchingProgress(s, today).days).toBe(28);
    expect(watchingProgress(s, today).perWeek).toBe(3.5);
  });

  it("leaves the pace undefined under a week of watching, since it would be a projection rather than a rate", () => {
    const today = YearMonthDay.get(2022, 1, 3);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), endDate: undefined });

    expect(watchingProgress(s, today).perWeek).toBeUndefined();
  });

  it("rounds the weekly pace to one decimal place", () => {
    const today = YearMonthDay.get(2022, 1, 28);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), e: 14, endDate: undefined });

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
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), e: 14, minutes: 0, endDate: undefined });

    expect(statsCardLabelWatching(s, today)).toEqual([
      ["1 Jan 2022", "28 days in"],
      ["14 eps", "3.5/wk"],
    ]);
  });

  it("leaves the days-in cell blank when the season has not started yet", () => {
    const today = YearMonthDay.get(2022, 1, 1);
    const notYetStarted = season(show(), { startDate: YearMonthDay.get(2022, 4, 1), endDate: undefined });

    expect(statsCardLabelWatching(notYetStarted, today)[0][1]).toBe("");
  });

  it("leaves the pace cell blank when fewer than a week has passed", () => {
    const today = YearMonthDay.get(2022, 1, 3);
    const s = season(show(), { startDate: YearMonthDay.get(2022, 1, 1), endDate: undefined });

    expect(statsCardLabelWatching(s, today)[1][1]).toBe("");
  });
});

describe("heroSeason", () => {
  /** A show whose last season is still running, optionally behind one the sheet has closed. */
  const watchingShow = (name: string, dates: { cell?: YearMonthDay; finale?: YearMonthDay } = {}) => {
    const parent = show({ name });
    const finished = dates.finale ? [season(parent, { s: 1, endDate: dates.finale })] : [];
    parent.s = [
      ...finished,
      season(parent, {
        s: finished.length + 1,
        startDate: YearMonthDay.get(2026, 1, 5),
        endDate: undefined,
        lastWatchedDate: dates.cell,
      }),
    ];
    return parent;
  };

  /** A show closed off entirely, as one finished and marked Ended is. */
  const endedShow = (name: string, finale: YearMonthDay) => {
    const parent = show({ name, status: "Ended" });
    parent.s = [season(parent, { s: 1, endDate: finale, lastWatchedDate: finale })];
    return parent;
  };

  it("picks the season watched most recently", () => {
    const older = watchingShow("The Expanse", { cell: YearMonthDay.get(2026, 8, 1) });
    const newer = watchingShow("Severance", { cell: YearMonthDay.get(2026, 8, 28) });

    expect(heroSeason([older, newer])).toBe(newer.s[0]);
    expect(heroSeason([newer, older])).toBe(newer.s[0]);
  });

  it("elects a finished season of a show that is over, the finale being a watch like any other", () => {
    const watching = watchingShow("The Expanse", { cell: YearMonthDay.get(2026, 8, 1) });
    const finished = endedShow("Black Bird", YearMonthDay.get(2026, 8, 28));

    expect(heroSeason([watching, finished])).toBe(finished.s[0]);
    expect(heroSeason([finished, watching])).toBe(finished.s[0]);
  });

  it("names a show's finale where the season it has moved on to is one the sheet has not dated", () => {
    // The running season records no watch, so the finale before it is the last episode this show
    // can be shown to have played.
    const between = watchingShow("Fargo", { finale: YearMonthDay.get(2026, 8, 28) });

    expect(heroSeason([between])).toBe(between.s[0]);
  });

  it("names the season a show is on once the sheet dates it, over that show's own earlier finale", () => {
    const onIt = watchingShow("Fargo", {
      finale: YearMonthDay.get(2026, 8, 28),
      cell: YearMonthDay.get(2026, 9, 4),
    });

    expect(heroSeason([onIt])).toBe(onIt.s[1]);
  });

  it("leads with the finished season where two were watched on one day", () => {
    // Day precision is all the sheet records, so a tie is as common as watching two shows in an
    // evening; finishing something is the more notable of the two.
    const day = YearMonthDay.get(2026, 9, 6);
    const watching = watchingShow("Malcolm in the Middle", { cell: day });
    const finished = endedShow("Black Bird", day);

    expect(heroSeason([watching, finished])).toBe(finished.s[0]);
    expect(heroSeason([finished, watching])).toBe(finished.s[0]);
  });

  it("ignores a season the sheet dates neither way", () => {
    const unmarked = watchingShow("One Piece");
    const marked = watchingShow("Severance", { cell: YearMonthDay.get(2026, 8, 28) });

    expect(heroSeason([unmarked, marked])).toBe(marked.s[0]);
  });

  it("elects nobody when the sheet dates no season at all, rather than inventing a tie-break", () => {
    // The sheet may predate the column entirely, with nothing yet finished; the page then keeps
    // the plain strip.
    expect(heroSeason([watchingShow("A"), watchingShow("B")])).toBeUndefined();
  });

  it("elects nobody for an empty library", () => {
    expect(heroSeason([])).toBeUndefined();
  });

  it("elects out of the two lists, from whichever holds the newest watch", () => {
    // The Omnibus band leads with this election, so it has to be able to name a season the page
    // shows as in hand or one it shows as finished — the head of the same order both lists are
    // cut from, and never a season neither of them holds.
    const open = watchingShow("Severance", { cell: YearMonthDay.get(2026, 8, 28) });
    const closed = endedShow("Black Bird", YearMonthDay.get(2026, 8, 1));

    expect(currentlyWatching([open, closed])).toContain(heroSeason([open, closed]));
    expect(recentlyWatched([open, closed])[0]).not.toBe(heroSeason([open, closed]));

    const laterFinale = endedShow("Black Bird", YearMonthDay.get(2026, 9, 4));

    expect(recentlyWatched([open, laterFinale])).toContain(heroSeason([open, laterFinale]));
  });

  it("favours the finished season where both lists hold the same newest date", () => {
    const day = YearMonthDay.get(2026, 9, 6);
    const open = watchingShow("Malcolm in the Middle", { cell: day });
    const closed = endedShow("Black Bird", day);

    expect(heroSeason([open, closed])).toBe(recentlyWatched([open, closed])[0]);
    expect(heroSeason([closed, open])).toBe(recentlyWatched([closed, open])[0]);
  });
});

describe("showHeroStats", () => {
  const today = YearMonthDay.get(2026, 2, 2);
  const heroOf = (franchiseCount: number) => {
    const parent = show({ franchise: "Star Trek" });
    parent.s = [season(parent, { startDate: YearMonthDay.get(2026, 1, 5), e: 8, endDate: undefined })];
    return showHeroStats(parent.s[0], franchiseCount, today);
  };

  it("carries the strip's own honest figures at tile size: episodes, days in, pace", () => {
    const labels = heroOf(1).map((stat) => stat.label);

    expect(labels).toEqual(["Episodes", "Days In", "Eps / Week"]);
  });

  it("labels a finished season's figure Days, the span the sheet closed rather than one still open", () => {
    const parent = show({ franchise: "Star Trek" });
    parent.s = [
      season(parent, { startDate: YearMonthDay.get(2026, 1, 5), endDate: YearMonthDay.get(2026, 1, 18), e: 8 }),
    ];

    expect(showHeroStats(parent.s[0], 1, today)).toContainEqual({ label: "Days", value: 14 });
  });

  it("adds a franchise tile only where there is a series to count", () => {
    expect(heroOf(3).at(-1)).toEqual({ label: "Star Trek Shows", value: 3 });
    expect(heroOf(1).map((stat) => stat.label)).not.toContain("Star Trek Shows");
  });
});

describe("earliestYear", () => {
  it("reads the earliest start from the data, and falls back to the current year when empty", () => {
    expect(earliestYear([show({ startDate: YearMonthDay.get(2009, 6, 1) }), show()])).toBe(2009);
    expect(earliestYear([])).toBe(CURRENT_YEAR);
  });
});

describe("measureOf", () => {
  const two = show({ e: 20, minutes: 600 });
  two.s = [season(two, { s: 5, e: 10, minutes: 300 }), season(two, { s: 6, e: 10, minutes: 300 })];
  const one = show({ e: 8, minutes: 90 });
  one.s = [season(one, { s: 1, e: 8, minutes: 90 })];
  const shows = [two, one];

  it("counts shows, episodes and floored hours under those measures", () => {
    expect(measureOf(shows, "Shows")).toBe(2);
    expect(measureOf(shows, "Episodes")).toBe(28);
    expect(measureOf(shows, "Hours")).toBe(11);
  });

  it("counts the seasons on record under Seasons, not the season numbering", () => {
    expect(measureOf(shows, "Seasons")).toBe(3);
  });
});
