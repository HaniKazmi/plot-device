import { describe, expect, it } from "vitest";
import { CURRENT_YEAR, YearMonthDay, Year, type YearNumber } from "../../src/common/date";
import { electNow, hasNow, ofMedium, omniTitle, recentlyFinished, unionTotals } from "../../src/omnibus/adapter";
import type { MediumLazy } from "../../src/common/medium";
import { MEDIA as MEDIA_ORDER, type Medium } from "../../src/utils/types";
import { earliestYear } from "../../src/omnibus/filterUtils";
import { measureOf, omniHours, toOmniItems, visibleLibrary } from "../../src/app/library";
import { omniBanner } from "../../src/app/media";
import { measureOf as movieMeasureOf } from "../../src/movie/statsData";
import { measureOf as showMeasureOf } from "../../src/show/statsData";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";
import { now as bookNow } from "../../src/books/now";
import { now as movieNow } from "../../src/movie/now";
import { now as showNow } from "../../src/show/now";
import { now as vgNow } from "../../src/vg/now";

/**
 * A show holding the seasons described, with the totals rolled up into the parent the way the
 * converter does — a show's own `minutes` is the sum of its seasons', and a fixture that let the
 * two disagree would make any comparison against the Shows tab's own figures meaningless.
 */
const showWith = (seasons: { start: number; end?: number; minutes?: number }[], overrides = {}) => {
  const parent = show({ startDate: YearMonthDay.get(seasons[0].start, 3, 1), ...overrides });
  // Numbered from the position rather than from `parent.s.length`, which is still the empty array
  // while this map runs — a show whose seasons all called themselves S1 would hide exactly the
  // collision the card keys have to survive.
  parent.s = seasons.map(({ start, end, minutes }, index) =>
    season(parent, {
      s: index + 1,
      startDate: YearMonthDay.get(start, 3, 1),
      endDate: end ? YearMonthDay.get(end, 6, 1) : undefined,
      minutes: minutes ?? 405,
    }),
  );
  parent.e = parent.s.reduce((total, season) => total + season.e, 0);
  parent.minutes = parent.s.reduce((total, season) => total + season.minutes, 0);
  return parent;
};

describe("year attribution", () => {
  it("counts a game to the year it was finished, not the year it was started", () => {
    // A game played across a new year is a fact about the year it was beaten in: that is when the
    // hours landed, and it is the year every chart on the page places it in.
    const [item] = toOmniItems(
      library({
        game: [videoGame({ startDate: YearMonthDay.get(2019, 12, 20), endDate: YearMonthDay.get(2020, 1, 8) })],
      }),
    );

    expect(item.year).toBe(2020);
    expect(item.closeDate).toBe(YearMonthDay.get(2020, 1, 8));
  });

  it("falls back to the start year for a game still being played, and leaves it unclosed", () => {
    const [item] = toOmniItems(
      library({ game: [videoGame({ startDate: YearMonthDay.get(2024, 5, 1), endDate: undefined })] }),
    );

    expect(item.year).toBe(2024);
    expect(item.closeDate).toBeUndefined();
  });

  it("reads a year-only game date, which half the games sheet carries", () => {
    const [item] = toOmniItems(library({ game: [videoGame({ startDate: Year.get(2007), endDate: undefined })] }));

    expect(item.year).toBe(2007);
  });

  it("counts a season the same way — the year it ended, or the year it started while it runs", () => {
    const items = toOmniItems(library({ show: [showWith([{ start: 2021, end: 2022 }, { start: 2024 }])] }));

    expect(items.map((item) => item.year)).toEqual([2022, 2024]);
    expect(items[1].closeDate).toBeUndefined();
  });

  it("counts a film to the year it was watched, whatever year it was released", () => {
    const [item] = toOmniItems(
      library({
        movie: [movie({ releaseDate: YearMonthDay.get(1999, 3, 31), startDate: YearMonthDay.get(2018, 7, 4) })],
      }),
    );

    expect(item.year).toBe(2018);
    // A film's watch date is also its close: being watched is the whole of it.
    expect(item.closeDate).toBe(YearMonthDay.get(2018, 7, 4));
  });
});

describe("hours normalisation", () => {
  it("takes a game's logged hours as they are, and zero where none are logged", () => {
    const items = toOmniItems(library({ game: [videoGame({ hours: 50 }), videoGame({ hours: undefined })] }));

    expect(items.map((item) => item.hours)).toEqual([50, 0]);
    expect(omniHours(items)).toBe(50);
  });

  it("floors the total once rather than each item, so short items are not rounded away", () => {
    // Three 40-minute items are two hours. Flooring per item makes them zero, which is the shape
    // of a bug that silently removes most of a library rather than one that looks wrong.
    const items = toOmniItems(library({ movie: [40, 40, 40].map((minutes) => movie({ minutes })) }));

    expect(omniHours(items)).toBe(2);
  });

  it("answers the same hours each home tab does for the same rows", () => {
    // The point of the shared unit: a medium's total here and on its own tab are the same figure,
    // so a reader moving between them is not quietly shown two answers.
    const movies = [movie({ minutes: 116 }), movie({ minutes: 97 }), movie({ minutes: 143 })];
    const shows = [
      showWith([
        { start: 2021, minutes: 484 },
        { start: 2022, minutes: 350 },
      ]),
    ];
    const items = toOmniItems(library({ movie: movies, show: shows }));

    expect(omniHours(ofMedium(items, "movie"))).toBe(movieMeasureOf(movies, "Hours"));
    expect(omniHours(ofMedium(items, "show"))).toBe(showMeasureOf(shows, "Hours"));
  });

  it("counts an item as one under the Items measure, whatever it cost in hours", () => {
    const items = toOmniItems(library({ game: [videoGame({ hours: 120 })], movie: [movie({ minutes: 96 })] }));

    expect(measureOf(items, "Items")).toBe(2);
  });
});

describe("flattening", () => {
  it("contributes a season per season, each carrying its show's own facts", () => {
    const parent = showWith([{ start: 2021, end: 2022 }, { start: 2024 }], {
      name: "Severance",
      genre: "Sci-Fi",
      genres: ["Drama"],
      franchise: "Severance",
      rating: "15",
    });
    const items = toOmniItems(library({ show: [parent] }));

    expect(items).toHaveLength(2);
    // The show's name, not the season's: which season it is stays on the source record, where a
    // card that wants to say "S2" reads it.
    expect(items.map((item) => item.name)).toEqual(["Severance", "Severance"]);
    expect(items[0].genre).toBe("Sci-Fi");
    expect(items[0].genres).toEqual(["Drama"]);
    expect(items[0].franchise).toBe("Severance");
    expect(items[0].rating).toBe("15");
    expect(items[0].source).toBe(parent.s[0]);
  });

  it("gives a game no secondary genres, because the sheet records themes rather than genres", () => {
    const [item] = toOmniItems(library({ game: [videoGame({ theme: ["Fantasy"] })] }));

    expect(item.genres).toEqual([]);
  });

  it("keeps the record each item came from, which is what lets a domain render its own card", () => {
    const game = videoGame();
    const film = movie();
    const items = toOmniItems(library({ game: [game], movie: [film] }));

    expect(items.map((item) => item.source)).toEqual([game, film]);
    expect(items.map((item) => item.medium)).toEqual(["game", "movie"]);
  });
});

describe("union totals", () => {
  it("counts the years anything falls in, not the span between the first and the last", () => {
    // A span would count the years nothing happened in, which on three sheets starting in
    // different decades is the difference between "years of this" and "years since the first row".
    const items = toOmniItems(
      library({
        movie: [
          movie({ startDate: YearMonthDay.get(2001, 1, 1) }),
          movie({ startDate: YearMonthDay.get(2001, 6, 1) }),
          movie({ startDate: YearMonthDay.get(2020, 1, 1) }),
        ],
      }),
    );

    expect(unionTotals(items).years).toBe(2);
    expect(unionTotals(items).items).toBe(3);
  });

  it("falls back to the current year when nothing survives the filters", () => {
    expect(earliestYear([])).toBe(CURRENT_YEAR);
  });

  it("opens the year select at the first year the union holds anything in", () => {
    const items = toOmniItems(
      library({
        movie: [movie({ startDate: YearMonthDay.get(2011, 1, 1) })],
        game: [videoGame({ startDate: Year.get(2004), endDate: undefined })],
      }),
    );

    expect(earliestYear(items)).toBe(2004 as YearNumber);
  });
});

describe("what a browse surface reads off an item", () => {
  it("draws a season as its show, which is where the sheets keep the artwork", () => {
    const parent = showWith([{ start: 2021, end: 2022 }]);
    const [item] = toOmniItems(library({ show: [parent] }));

    expect(omniBanner(item)).toBe(parent.banner);
  });

  it("has no artwork for a game the sheet never gave one, which is what keeps it off a wall", () => {
    const [item] = toOmniItems(library({ game: [videoGame({ banner: undefined })] }));

    expect(omniBanner(item)).toBeUndefined();
  });

  it("names a season by its number, so a strip of one show's seasons is not six identical labels", () => {
    const items = toOmniItems(library({ show: [showWith([{ start: 2021, end: 2022 }, { start: 2023 }])] }));

    expect(items.map(omniTitle)).toEqual(["Severance S1", "Severance S2"]);
  });

  it("gives every item of one show a key of its own", () => {
    // Every season carries its show's name, so a key built from the name alone repeats — and React
    // renders one card of the pair in place of the other, or drops it.
    const items = toOmniItems(library({ show: [showWith([{ start: 2021, end: 2022 }, { start: 2023 }])] }));

    expect(new Set(items.map((item) => item.key)).size).toBe(items.length);
  });

  it("gives two copies of one game keys of their own, however coarse the dates it carries", () => {
    // Half the games sheet records a bare year, and a game's medium, title and close are then all
    // three of them shared by the same game on another platform finished in that same year. The
    // platform is what tells the two apart, and the Games tab already keys a span by it.
    const items = toOmniItems(
      library({
        game: [
          videoGame({ name: "Portal", platform: "PC", startDate: Year.get(2010), endDate: Year.get(2010) }),
          videoGame({
            name: "Portal",
            platform: "Xbox 360",
            startDate: Year.get(2010),
            endDate: Year.get(2010),
          }),
        ],
      }),
    );

    expect(new Set(items.map((item) => item.key)).size).toBe(2);
  });

  it("gives two watches of one film keys of their own", () => {
    const items = toOmniItems(
      library({
        movie: [
          movie({ name: "Arrival", startDate: YearMonthDay.get(2017, 2, 1) }),
          movie({ name: "Arrival", startDate: YearMonthDay.get(2024, 9, 3) }),
        ],
      }),
    );

    expect(new Set(items.map((item) => item.key)).size).toBe(2);
  });
});

describe("recently finished", () => {
  const items = () =>
    toOmniItems(
      library({
        game: [
          videoGame({ startDate: YearMonthDay.get(2023, 1, 1), endDate: YearMonthDay.get(2023, 5, 4) }),
          videoGame({ startDate: YearMonthDay.get(2024, 2, 2), endDate: undefined }),
        ],
        movie: [movie({ startDate: YearMonthDay.get(2024, 3, 9) })],
      }),
    );

  it("puts the newest close first, whichever medium it came from", () => {
    expect(recentlyFinished(items()).map((item) => String(item.closeDate))).toEqual(["2024-03-09", "2023-05-04"]);
  });

  it("leaves out what has not finished, rather than listing it last", () => {
    // An item with no close date is still being played or watched, and calling it recently
    // finished says something false — where a six-card strip would never reach it anyway.
    expect(recentlyFinished(items()).every((item) => item.closeDate)).toBe(true);
  });

  it("has nothing to show for a library still entirely in progress", () => {
    const open = toOmniItems(library({ game: [videoGame({ endDate: undefined })] }));

    expect(recentlyFinished(open)).toEqual([]);
  });
});

/**
 * A registry whose every medium elects its first row.
 *
 * What `electNow` owns is the walk — which medium's module is handed which library, and which
 * media are asked at all — where each domain's own pair is run below through its `now` module,
 * the pure half of `module.lazy.ts`: naming the lazy module itself here would put four card trees
 * in a `node` test process.
 */
const firstRow: Record<Medium, MediumLazy<unknown>> = Object.fromEntries(
  MEDIA_ORDER.map((medium) => [medium, { elect: (rows: readonly unknown[]) => rows[0] }]),
) as Record<Medium, MediumLazy<unknown>>;

describe("electing what each medium is on now", () => {
  const playing = videoGame({ status: "Playing", startDate: YearMonthDay.get(2026, 1, 2) });
  const latest = movie({ startDate: YearMonthDay.get(2026, 2, 3) });
  const all = { game: true, show: true, movie: true, book: true };

  it("hands each medium's own module that medium's own rows", () => {
    const now = electNow(firstRow, library({ game: [playing, videoGame()], movie: [latest] }), all);

    expect(now.game).toBe(playing);
    expect(now.movie).toBe(latest);
  });

  it("offers nothing for a medium with nothing in flight", () => {
    const now = electNow(firstRow, library({ movie: [latest] }), all);

    expect(now.game).toBeUndefined();
    expect(hasNow(now)).toBe(true);
  });

  it("says there is no band where no medium answers", () => {
    expect(hasNow(electNow(firstRow, library(), all))).toBe(false);
  });

  it("asks nothing of a medium switched off, which is not on the page to be headlined", () => {
    const now = electNow(firstRow, library({ game: [playing], movie: [latest] }), { ...all, game: false });

    expect(now.game).toBeUndefined();
    expect(now.movie).toBe(latest);
  });
});

describe("a book in the union", () => {
  it("counts to the year it was finished, closes on its end date, and keys on its start", () => {
    const [item] = toOmniItems(
      library({
        book: [book({ startDate: YearMonthDay.get(2025, 12, 20), endDate: YearMonthDay.get(2026, 1, 8) })],
      }),
    );

    expect(item.medium).toBe("book");
    expect(item.year).toBe(2026);
    expect(item.closeDate).toBe(YearMonthDay.get(2026, 1, 8));
    expect(item.key).toBe("book-Chasm City-2025-12-20");
  });

  it("counts an open book to the year it was begun, with no close", () => {
    const [item] = toOmniItems(
      library({ book: [book({ status: "Reading", startDate: YearMonthDay.get(2026, 5, 1), endDate: undefined })] }),
    );

    expect(item.year).toBe(2026);
    expect(item.closeDate).toBeUndefined();
  });

  it("carries exact hours, one genre, its franchise and no certificate", () => {
    const [item] = toOmniItems(library({ book: [book({ hours: 1.5, genre: "Fantasy", franchise: "Cosmere" })] }));

    expect(item.hours).toBe(1.5);
    expect(item.genre).toBe("Fantasy");
    expect(item.genres).toEqual([]);
    expect(item.franchise).toBe("Cosmere");
    // Nothing certifies a book; every certificate surface drops it rather than shelving a blank.
    expect(item.rating).toBeUndefined();
  });

  it("tells a reread from the first read, which is a second row with one title", () => {
    const [first, again] = toOmniItems(
      library({
        book: [book({ startDate: YearMonthDay.get(2020, 1, 1) }), book({ startDate: YearMonthDay.get(2024, 1, 1) })],
      }),
    );

    expect(first.key).not.toBe(again.key);
  });

  it("is drawn as its own cover and named by its own title", () => {
    const [item] = toOmniItems(library({ book: [book({ banner: "cover.jpeg" })] }));

    expect(omniBanner(item)).toBe("cover.jpeg");
    expect(omniTitle(item)).toBe("Chasm City");
  });

  it("has no picture while the sheet's Banner column has not reached it", () => {
    const [item] = toOmniItems(library({ book: [book({ banner: "" })] }));

    expect(omniBanner(item)).toBeUndefined();
  });

  it("keeps every book under guest mode, since nothing on the sheet marks one to hide", () => {
    const books = [book()];

    expect(visibleLibrary(library({ book: books }), true).book).toEqual(books);
  });
});

/**
 * Each medium's own election feeds its own panel: the registry erases the record, so the one
 * place the pair is run as the band runs it is here, on the rows each tab's hero is elected from.
 */
describe("each medium's Now pair", () => {
  it("names the game in progress", () => {
    const playing = videoGame({ name: "Tunic", status: "Playing", startDate: YearMonthDay.get(2026, 1, 2) });
    const item = vgNow.elect([videoGame(), playing]);

    expect(item).toBe(playing);
    expect(vgNow.nowPanel(item!, "light").title).toBe("Tunic");
  });

  it("names the season the sheet marks as current", () => {
    const watching = show({ name: "Severance", lastWatchedDate: YearMonthDay.get(2026, 3, 4) });
    watching.s.push(season(watching, { s: 2 }));
    const item = showNow.elect([show({ status: "Ended" }), watching]);

    expect(item?.show).toBe(watching);
    expect(showNow.nowPanel(item!, "light").title).toBe("Severance S2");
  });

  it("names the film watched most recently", () => {
    const latest = movie({ name: "Dune", startDate: YearMonthDay.get(2026, 2, 3) });
    const item = movieNow.elect([movie(), latest]);

    expect(item).toBe(latest);
    expect(movieNow.nowPanel(item!, "light").title).toBe("Dune");
  });

  it("names the book in hand", () => {
    const reading = book({ name: "Pushing Ice", status: "Reading", startDate: YearMonthDay.get(2026, 4, 5) });
    const item = bookNow.elect([book(), reading]);

    expect(item).toBe(reading);
    expect(bookNow.nowPanel(item!, "light").title).toBe("Pushing Ice");
  });
});
