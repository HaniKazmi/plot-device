import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import {
  creditColumn,
  creditIndex,
  dossierRows,
  franchiseItems,
  franchiseLines,
  franchiseRank,
  franchiseShelves,
  franchiseTop,
  franchiseYears,
  rankedTops,
  selfPublished,
} from "../../src/omnibus/franchiseData";
import { book } from "../fixtures/books";
import { videoGame } from "../fixtures/gameRows";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";

const TODAY = YearMonthDay.get(2026, 9, 1);

const day = (year: number, month: number, date: number) => YearMonthDay.get(year, month, date);

/** A show met over seasons beginning on the given days, each closing a month later. */
const showOf = (overrides: Parameters<typeof show>[0], ...starts: YearMonthDay[]) => {
  const parent = show(overrides);
  for (const start of starts) {
    parent.s.push(season(parent, { startDate: start, endDate: day(start.year, start.month + 1, 1) }));
  }
  return parent;
};

/**
 * One franchise across all four media, with a series of the same name in two of them, and a
 * little of the rest of the library made by the same hands.
 */
const witcher = () =>
  toOmniItems(
    library({
      game: [
        videoGame({
          name: "Witcher 3",
          franchise: "Witcher",
          series: "Witcher",
          seriesNumber: 3,
          developer: "CD Projekt Red",
          publisher: "CD Projekt Red",
          platform: "PlayStation 4",
          genre: "Fantasy",
          hours: 155,
          startDate: day(2017, 11, 28),
          endDate: day(2018, 7, 8),
        }),
        videoGame({
          name: "Witcher 2",
          franchise: "Witcher",
          series: "Witcher",
          seriesNumber: 2,
          developer: "CD Projekt Red",
          publisher: "CD Projekt Red",
          platform: "PC",
          genre: "Fantasy",
          hours: 63,
          startDate: day(2015, 5, 17),
          endDate: day(2015, 7, 12),
        }),
        videoGame({
          name: "Cyberpunk 2077",
          franchise: "Cyberpunk 2077",
          developer: "CD Projekt Red",
          publisher: "CD Projekt Red",
          hours: 100,
        }),
      ],
      show: [
        showOf(
          { name: "The Witcher", franchise: "Witcher", network: "Netflix", genre: "Fantasy", otherGenres: ["Drama"] },
          day(2020, 1, 2),
          day(2022, 1, 14),
        ),
        showOf({ name: "Castlevania", franchise: "Castlevania", network: "Netflix" }, day(2021, 5, 1)),
      ],
      movie: [
        movie({
          name: "Nightmare of the Wolf",
          franchise: "Witcher",
          director: "Kwang Il Han",
          genre: "Fantasy",
          otherGenres: ["Action"],
          score: 7,
          cinema: false,
          startDate: day(2021, 9, 23),
        }),
        movie({ name: "Arrival", franchise: "Arrival" }),
      ],
      book: [
        book({
          name: "Sword of Destiny",
          franchise: "Witcher",
          series: "Witcher",
          seriesNumber: 2,
          author: "Andrzej Sapkowski",
          genre: "Fantasy",
          score: undefined,
          startDate: day(2020, 3, 3),
          endDate: day(2020, 3, 26),
        }),
        book({
          name: "The Last Wish",
          franchise: "Witcher",
          series: "Witcher",
          seriesNumber: 1,
          author: "Andrzej Sapkowski",
          genre: "Fantasy",
          score: 8,
          startDate: day(2020, 2, 22),
          endDate: day(2020, 2, 23),
        }),
      ],
    }),
  );

const own = () => franchiseItems(witcher(), "Witcher");

describe("a franchise's rows", () => {
  it("are every row its column names, a show contributing a row per season", () => {
    expect(own()).toHaveLength(7);
    expect(new Set(own().map((item) => item.medium))).toEqual(new Set(["game", "show", "movie", "book"]));
  });

  it("span the years from the first meeting to the last close, both ends counted", () => {
    expect(franchiseYears(own(), TODAY)).toBe(2022 - 2015 + 1);
  });
});

describe("franchiseRank", () => {
  it("ranks among every franchise in the library by hours, a standalone work's included", () => {
    // Cyberpunk 2077, Castlevania and Arrival are each a franchise of one, and counted.
    expect(franchiseRank(witcher(), "Witcher")).toMatchObject({ rank: 1, of: 4 });
    expect(franchiseRank(witcher(), "Cyberpunk 2077")).toMatchObject({ rank: 2, of: 4 });
  });
});

describe("franchiseLines", () => {
  it("keeps a series inside its own medium, however two media name it", () => {
    const lines = franchiseLines(own(), TODAY);

    expect(lines.map((line) => [line.medium, line.name])).toEqual([
      ["game", "Witcher"],
      ["show", "The Witcher"],
      ["book", "Witcher"],
    ]);
  });

  it("orders a line by its own numbers, not by when its entries were met", () => {
    const books = franchiseLines(own(), TODAY).find((line) => line.medium === "book")!;

    expect(books.items.map((item) => item.name)).toEqual(["The Last Wish", "Sword of Destiny"]);
  });

  it("reads a show's seasons as its line", () => {
    const show = franchiseLines(own(), TODAY).find((line) => line.medium === "show")!;

    expect(show.items).toHaveLength(2);
  });
});

describe("franchiseShelves", () => {
  it("shelves by series, with every work outside a line together at the foot", () => {
    const shelves = franchiseShelves(own(), "series", TODAY);

    expect(shelves.map((shelf) => shelf.name)).toEqual(["Witcher", "The Witcher", "Witcher", "Standalone"]);
    expect(shelves.at(-1)!.items.map((item) => item.name)).toEqual(["Nightmare of the Wolf"]);
  });

  it("shelves by medium in the app's own medium order", () => {
    expect(franchiseShelves(own(), "medium", TODAY).map((shelf) => shelf.medium)).toEqual([
      "game",
      "show",
      "movie",
      "book",
    ]);
  });

  it("shelves by the year each work was begun, newest first", () => {
    expect(franchiseShelves(own(), "year", TODAY).map((shelf) => shelf.name)).toEqual([
      "2022",
      "2021",
      "2020",
      "2017",
      "2015",
    ]);
  });
});

describe("dossierRows", () => {
  it("states where the franchise began, its biggest line, its best score and its longest game", () => {
    const rows = Object.fromEntries(
      dossierRows(own(), franchiseLines(own(), TODAY), TODAY).map((row) => [row.label, row.value]),
    );

    expect(rows.First).toBe("Witcher 2, 17 May 2015");
    expect(rows["Best rated"]).toBe("The Last Wish, 8/10");
    expect(rows["Longest game"]).toBe("Witcher 3, 155 hours");
    expect(rows["Biggest series"]).toBe("Witcher, 2");
  });

  it("states a field the whole franchise shares as one word, and leaves out one it does not", () => {
    const films = toOmniItems(
      library({
        movie: [
          movie({ name: "Knives Out", franchise: "Knives Out", cinema: false }),
          movie({ name: "Glass Onion", franchise: "Knives Out", cinema: false, startDate: day(2022, 12, 22) }),
        ],
      }),
    );
    const rows = Object.fromEntries(
      dossierRows(films, franchiseLines(films, TODAY), TODAY).map((row) => [row.label, row.value]),
    );

    expect(rows.Media).toBe("Movies only");
    expect(rows.Style).toBe("All Realistic");
    expect(rows.Where).toBe("All Home");
    expect(dossierRows(own(), franchiseLines(own(), TODAY), TODAY).map((row) => row.label)).not.toContain("Where");
  });
});

describe("a field the whole franchise shares", () => {
  // A film and the novel it adapts: one style recorded, on the film alone, since a book has none.
  const adaptation = () =>
    toOmniItems(
      library({
        movie: [
          movie({
            name: "Dune",
            franchise: "Dune",
            genre: "Sci-Fi",
            otherGenres: [],
            style: "Realistic",
            cinema: true,
          }),
        ],
        book: [book({ name: "Dune", franchise: "Dune", genre: "Sci-Fi" })],
      }),
    );

  it("names the media that carry no such field rather than claiming it of them", () => {
    const rows = Object.fromEntries(
      dossierRows(adaptation(), franchiseLines(adaptation(), TODAY), TODAY).map((row) => [row.label, row.value]),
    );

    expect(rows.Style).toBe("All Realistic, Books aside");
    expect(rows.Genre).toBe("All Sci-Fi");
  });

  it("gets a dossier line and no ranked card, and a field of two values the reverse", () => {
    const stated = dossierRows(adaptation(), [], TODAY).map((row) => row.label);
    const ranked = rankedTops(adaptation());

    expect(ranked).not.toContain("style");
    expect(stated).toContain("Style");
    expect(ranked).toContain("where");
    expect(stated).not.toContain("Where");
  });
});

describe("franchiseTop", () => {
  it("counts every genre an item carries, not only its first", () => {
    const genres = Object.fromEntries(franchiseTop(own(), "genre", "Items").map((group) => [group.name, group.count]));

    expect(genres).toEqual({ Fantasy: 7, Drama: 2, Action: 1 });
  });

  it("ranks where the franchise was met, in the page's own measure", () => {
    const where = franchiseTop(own(), "where", "Hours");

    expect(where[0]).toMatchObject({ name: "PlayStation 4", count: 155, top: "PlayStation 4" });
  });
});

describe("creditColumn", () => {
  it("lists who made the franchise, the most prolific first, with what else they made", () => {
    const [studio] = creditColumn(own(), creditIndex(witcher()), "developer");

    expect(studio).toMatchObject({ name: "CD Projekt Red", works: 2, hours: 218 });
    expect(studio.elsewhere).toEqual([{ franchise: "Cyberpunk 2077", works: 1 }]);
    expect(studio.everything).toHaveLength(3);
  });

  it("counts a show elsewhere once however many seasons it ran", () => {
    const [network] = creditColumn(own(), creditIndex(witcher()), "network");

    expect(network.works).toBe(1);
    expect(network.elsewhere).toEqual([{ franchise: "Castlevania", works: 1 }]);
  });

  it("says when a credit leads nowhere else in the library", () => {
    const [author] = creditColumn(own(), creditIndex(witcher()), "author");

    expect(author.elsewhere).toEqual([]);
  });
});

describe("selfPublished", () => {
  it("is true while every game was published by the studio that made it", () => {
    expect(selfPublished(own())).toBe(true);
  });

  it("is false once any game names a publisher of its own", () => {
    const games = toOmniItems(library({ game: [videoGame({ developer: "Game Freak", publisher: "Nintendo" })] }));

    expect(selfPublished(games)).toBe(false);
  });
});
