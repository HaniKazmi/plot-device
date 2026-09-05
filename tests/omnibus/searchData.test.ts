import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/omnibus/adapter";
import {
  buildSearchIndex,
  franchiseFacts,
  franchiseWorks,
  recentFranchises,
  searchUnion,
  unionEpoch,
} from "../../src/omnibus/searchData";
import { workLabels } from "../../src/omnibus/cardData";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const TODAY = YearMonthDay.get(2026, 9, 1);

const showWithSeasons = (count: number, overrides = {}) => {
  const parent = show(overrides);
  for (let i = 0; i < count; i++) {
    parent.s.push(
      season(parent, {
        startDate: YearMonthDay.get(2020 + i, 1, 1),
        endDate: YearMonthDay.get(2020 + i, 6, 1),
        subtitle: i === 1 ? "The Cage" : undefined,
      }),
    );
  }
  return parent;
};

const trek = () =>
  toOmniItems(
    library({
      games: [videoGame({ name: "Star Trek: Resurgence", franchise: "Star Trek", hours: 11 })],
      shows: [showWithSeasons(3, { name: "Star Trek: Strange New Worlds", franchise: "Star Trek" })],
      movies: [movie({ name: "Star Trek Beyond", franchise: "Star Trek" })],
      books: [book()],
    }),
  );

describe("buildSearchIndex", () => {
  it("lists a show once however many seasons it ran, standing for it by its latest season", () => {
    const { items } = buildSearchIndex(trek());
    const shows = items.filter((entry) => entry.medium === "show");

    expect(shows).toHaveLength(1);
    expect(shows[0].name).toBe("Star Trek: Strange New Worlds");
    expect(shows[0].item.key).toContain("3");
  });

  it("offers a franchise only where some entry does not repeat its name, counted per medium", () => {
    const { franchises } = buildSearchIndex(trek());

    // Chasm City's franchise is Revelation Space, a name no entry repeats; Star Trek has three
    // entries whose names differ. Nothing here names itself.
    expect(franchises.map((entry) => entry.franchise).toSorted()).toEqual(["Revelation Space", "Star Trek"]);
    const startrek = franchises.find((entry) => entry.franchise === "Star Trek")!;
    expect(startrek.counts).toEqual({ game: 1, show: 3, movie: 1 });
    expect(startrek.size).toBe(5);
  });

  it("drops a franchise whose every entry repeats the name, which is a work naming itself", () => {
    const items = toOmniItems(library({ movies: [movie({ name: "Arrival", franchise: "Arrival" })] }));

    expect(buildSearchIndex(items).franchises).toEqual([]);
  });

  it("indexes the people and places a work is remembered by, per medium", () => {
    const { items } = buildSearchIndex(trek());
    const secondary = Object.fromEntries(items.map((entry) => [entry.medium, entry.secondary]));

    expect(secondary.game).toEqual(["Nintendo EPD", "Nintendo Switch"]);
    expect(secondary.show).toEqual(["Apple TV+", "", "The Cage", ""]);
    expect(secondary.movie).toEqual(["Denis Villeneuve"]);
    expect(secondary.book).toEqual(["Alastair Reynolds", "Revelation Space"]);
  });
});

describe("searchUnion", () => {
  it("answers franchises first, then each medium in the tabs' order, leaving out a group with nothing", () => {
    const groups = searchUnion(buildSearchIndex(trek()), "star");

    expect(groups.map((group) => group.key)).toEqual(["franchise", "game", "show", "movie"]);
    expect(groups[0].hits[0].entry.name).toBe("Star Trek");
  });

  it("finds a show by a season's own name", () => {
    const groups = searchUnion(buildSearchIndex(trek()), "cage");

    expect(groups.map((group) => group.key)).toEqual(["show"]);
  });

  it("finds a book by its author", () => {
    const [group] = searchUnion(buildSearchIndex(trek()), "reynolds");

    expect(group.key).toBe("book");
    expect(group.hits[0].entry.name).toBe("Chasm City");
  });
});

describe("franchiseWorks and franchiseFacts", () => {
  it("lists one card per work, newest first, and keeps a franchise of one work", () => {
    // The show closed in 2022, the game in April 2017 and the film was watched in January 2017.
    const works = franchiseWorks(trek(), "Star Trek", TODAY);

    expect(works.map((work) => work.medium)).toEqual(["show", "game", "movie"]);
    expect(franchiseWorks(trek(), "Revelation Space", TODAY)).toHaveLength(1);
  });

  it("captions a collapsed show by its name and the work's last close, never a season number", () => {
    const [show] = franchiseWorks(trek(), "Star Trek", TODAY);

    expect(workLabels(show)).toEqual([["1 Jun 2022"], ["Star Trek: Strange New Worlds"]]);
  });

  it("captions a work with any entry still open as in progress", () => {
    const items = toOmniItems(
      library({
        games: [
          videoGame({ franchise: "Zelda", endDate: undefined }),
          videoGame({ franchise: "Zelda", name: "Tears" }),
        ],
      }),
    );
    const [open] = franchiseWorks(items, "Zelda", TODAY).filter((work) => work.name === "Breath of the Wild");

    expect(workLabels(open)[0]).toEqual(["In progress"]);
  });

  it("states the first year, the last close, the floored hours and the media reached", () => {
    const items = trek().filter((item) => item.franchise === "Star Trek");
    const facts = franchiseFacts(items);

    expect(facts.firstYear).toBe(2017);
    expect(facts.last).toBe(YearMonthDay.get(2022, 6, 1));
    expect(facts.media).toBe(3);
    expect(Number.isInteger(facts.hours)).toBe(true);
  });

  it("takes the last close at the end of the range it denotes, so a bare year outlasts a day inside it", () => {
    const items = toOmniItems(
      library({
        games: [videoGame({ franchise: "Trek", startDate: Year.get(2010), endDate: Year.get(2010) })],
        movies: [movie({ franchise: "Trek", startDate: YearMonthDay.get(2010, 1, 5) })],
      }),
    );

    expect(franchiseFacts(items).last).toBe(Year.get(2010));
  });

  it("leaves the last date open while any row of the franchise is", () => {
    const items = toOmniItems(
      library({
        games: [
          videoGame({ franchise: "Zelda", endDate: undefined }),
          videoGame({ franchise: "Zelda", name: "Tears" }),
        ],
      }),
    );

    expect(franchiseFacts(items).last).toBeUndefined();
  });
});

describe("the palette before anything is typed", () => {
  it("offers the franchises met lately, dropping a group of one work", () => {
    expect(recentFranchises(trek(), TODAY, 5)).toEqual(["Star Trek"]);
  });

  it("opens the strip's scale on the first of January of the earliest year met", () => {
    expect(unionEpoch(trek(), TODAY)).toBe(YearMonthDay.get(2017, 1, 1));
    expect(unionEpoch([], TODAY)).toBe(YearMonthDay.get(2026, 1, 1));
  });
});
