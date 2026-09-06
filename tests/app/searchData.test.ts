import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems } from "../../src/app/library";
import {
  attributeAction,
  attributePlacements,
  attributeWorks,
  buildAttributeIndex,
  buildSearchIndex,
  franchiseFacts,
  franchiseWorks,
  recentFranchises,
  searchUnion,
  unionEpoch,
  type PlacedAttribute,
} from "../../src/app/searchData";
import { workLabels } from "../../src/app/cardData";
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

const trekLibrary = () =>
  library({
    game: [videoGame({ name: "Star Trek: Resurgence", franchise: "Star Trek", hours: 11 })],
    show: [showWithSeasons(3, { name: "Star Trek: Strange New Worlds", franchise: "Star Trek" })],
    movie: [movie({ name: "Star Trek Beyond", franchise: "Star Trek" })],
    book: [book()],
  });

const trek = () => toOmniItems(trekLibrary());

/** The whole index, over one library and the union built from it. */
const trekIndex = () => buildSearchIndex(trek(), trekLibrary());

describe("buildSearchIndex", () => {
  it("lists a show once however many seasons it ran, standing for it by its latest season", () => {
    const { items } = trekIndex();
    const shows = items.filter((entry) => entry.medium === "show");

    expect(shows).toHaveLength(1);
    expect(shows[0].name).toBe("Star Trek: Strange New Worlds");
    expect(shows[0].item.key).toContain("3");
  });

  it("offers a franchise only where some entry does not repeat its name, counted per medium", () => {
    const { franchises } = trekIndex();

    // Chasm City's franchise is Revelation Space, a name no entry repeats; Star Trek has three
    // entries whose names differ. Nothing here names itself.
    expect(franchises.map((entry) => entry.franchise).toSorted()).toEqual(["Revelation Space", "Star Trek"]);
    const startrek = franchises.find((entry) => entry.franchise === "Star Trek")!;
    expect(startrek.counts).toEqual({ game: 1, show: 3, movie: 1 });
    expect(startrek.size).toBe(5);
  });

  it("drops a franchise whose every entry repeats the name, which is a work naming itself", () => {
    const arrival = library({ movie: [movie({ name: "Arrival", franchise: "Arrival" })] });

    expect(buildSearchIndex(toOmniItems(arrival), arrival).franchises).toEqual([]);
  });

  it("indexes the people and places a work is remembered by, per medium", () => {
    const { items } = trekIndex();
    const secondary = Object.fromEntries(items.map((entry) => [entry.medium, entry.secondary]));

    expect(secondary.game).toEqual(["Nintendo EPD", "Nintendo Switch"]);
    expect(secondary.show).toEqual(["Apple TV+", "", "The Cage", ""]);
    expect(secondary.movie).toEqual(["Denis Villeneuve"]);
    expect(secondary.book).toEqual(["Alastair Reynolds", "Revelation Space"]);
  });
});

describe("searchUnion", () => {
  it("answers franchises first, then each medium in the tabs' order, leaving out a group with nothing", () => {
    const groups = searchUnion(trekIndex(), "star");

    expect(groups.map((group) => group.key)).toEqual(["franchise", "game", "show", "movie"]);
    expect(groups[0].hits[0].entry.name).toBe("Star Trek");
  });

  it("finds a show by a season's own name", () => {
    const groups = searchUnion(trekIndex(), "cage");

    expect(groups.map((group) => group.key)).toEqual(["show"]);
  });

  it("finds a book by its author", () => {
    const [group] = searchUnion(trekIndex(), "reynolds");

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
        game: [videoGame({ franchise: "Zelda", endDate: undefined }), videoGame({ franchise: "Zelda", name: "Tears" })],
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
        game: [videoGame({ franchise: "Trek", startDate: Year.get(2010), endDate: Year.get(2010) })],
        movie: [movie({ franchise: "Trek", startDate: YearMonthDay.get(2010, 1, 5) })],
      }),
    );

    expect(franchiseFacts(items).last).toBe(Year.get(2010));
  });

  it("leaves the last date open while any row of the franchise is", () => {
    const items = toOmniItems(
      library({
        game: [videoGame({ franchise: "Zelda", endDate: undefined }), videoGame({ franchise: "Zelda", name: "Tears" })],
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

describe("buildAttributeIndex", () => {
  it("counts a category's values per medium, and names every tab whose schema holds the category", () => {
    const entries = buildAttributeIndex(trekLibrary());
    const sciFi = entries.find((entry) => entry.category === "genre" && entry.value === "Sci-Fi")!;

    // The show, the film and the book are Sci-Fi; the game is Adventure.
    // Counted in each tab's own rows: one show, not the three seasons the union flattens it to.
    expect(sciFi.counts).toEqual({ show: 1, movie: 1, book: 1 });
    // The tabs a hit can be taken to are read off those counts, so they are the tabs holding a row
    // of it and not every tab whose schema has a genre: Games would otherwise offer a page filtered
    // to nothing. They come in the order the app says the media, which is the order the walk takes.
    expect(Object.keys(sciFi.counts)).toEqual(["show", "movie", "book"]);
  });

  it("offers a category only the tabs that hold it, counted on the medium that answers", () => {
    const platform = buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "platform")!;

    expect(platform.value).toBe("Nintendo Switch");
    expect(Object.keys(platform.counts)).toEqual(["game"]);
  });

  it("leaves the franchise column out: a franchise is a thing the box already answers with", () => {
    expect(buildAttributeIndex(trekLibrary()).some((entry) => entry.category === "franchise")).toBe(false);
  });

  it("groups a certificate on its band, so the two boards' names for one tier are one hit", () => {
    const rated = library({
      movie: [movie({ name: "Blade Runner", rating: "15" }), movie({ name: "Akira", rating: "16+" })],
    });
    const tiers = buildAttributeIndex(rated).filter((entry) => entry.category === "rating");

    expect(tiers.map((entry) => entry.value)).toEqual(["15/16"]);
    expect(tiers[0].counts.movie).toBe(2);
    // What the hit sets on the Movies tab: both notations, since the sheet holds each of them.
    expect(tiers[0].values.movie).toEqual(["15", "16+"]);
  });
});

describe("attributePlacements and attributeAction", () => {
  const genre = () =>
    buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "genre" && entry.value === "Sci-Fi")!;

  it("puts the tab being read first, as the one a hit filters rather than travels to", () => {
    const placed = attributePlacements(genre(), "show", ["genre", "network"]);

    expect(placed[0]).toMatchObject({ tab: "show", here: true });
    expect(placed.slice(1).map((hit) => hit.tab)).toEqual(["movies", "books"]);
    expect(placed.slice(1).every((hit) => !hit.here)).toBe(true);
  });

  it("offers no hit on a page holding the category but none of the value, which would empty it", () => {
    // Games can be narrowed by genre, and no game in this library is Sci-Fi.
    const placed = attributePlacements(genre(), "vg", ["genre", "platform"]);

    expect(placed.every((hit) => !hit.here)).toBe(true);
  });

  it("offers no hit on the page being read where that page cannot be narrowed by the category", () => {
    const platform = buildAttributeIndex(trekLibrary()).find((entry) => entry.category === "platform")!;
    const placed = attributePlacements(platform, "shows", ["genre", "network", "type", "franchise"]);

    expect(placed.map((hit) => ({ tab: hit.tab, here: hit.here }))).toEqual([{ tab: "vg", here: false }]);
  });

  it("places a hit on a tab that is no medium, whose own values are the ones it states", () => {
    const [placed] = attributePlacements(genre(), "omnibus", ["genre", "franchise"]);

    expect(placed).toMatchObject({ tab: "omnibus", here: true, medium: undefined });
    expect(attributeAction(placed, [])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: [placed.value],
    });
  });

  it("adds to whatever that tab already holds, and adds nothing it holds already", () => {
    const [placed] = attributePlacements(genre(), "show", ["genre"]);

    expect(attributeAction(placed, ["Horror"])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: ["Horror", placed.value],
    });
    expect(attributeAction(placed, [placed.value])).toEqual({
      type: "updateFilter",
      filter: "genre",
      value: [placed.value],
    });
  });

  it("sets both of a band's notations on a tab whose rows carry each of them", () => {
    const rated = library({
      movie: [movie({ name: "Blade Runner", rating: "15" }), movie({ name: "Akira", rating: "16+" })],
    });
    const tier = buildAttributeIndex(rated).find((entry) => entry.category === "rating")!;
    const [placed] = attributePlacements(tier, "movies", ["genre", "rating"]);

    expect(attributeAction(placed, [])).toEqual({
      type: "updateFilter",
      filter: "rating",
      value: ["15", "16+"],
    });
  });
});

describe("searchUnion over attributes", () => {
  it("splits a query's attributes into the page it can narrow and the pages it can travel to", () => {
    const groups = searchUnion(trekIndex(), "sci-fi", { tabId: "show", categories: ["genre", "network"] });
    const here = groups.find((group) => group.key === "filter-here")!;
    const there = groups.find((group) => group.key === "filter-there")!;

    expect(here.hits).toHaveLength(1);
    expect(here.hits[0].entry.name).toBe("Sci-Fi");
    // The tab being read is absent from the travel group, having its own hit in the other one.
    expect(there.hits.map((hit) => (hit.entry as PlacedAttribute).tab)).toEqual(["movies", "books"]);
  });

  it("offers no attribute group at all where the box is standing over no page", () => {
    // Nothing is named "Sci-Fi" in the four libraries, so without a page there is nothing to say.
    expect(searchUnion(trekIndex(), "sci-fi")).toEqual([]);
  });
});

describe("attributeWorks", () => {
  it("collapses the whole union's rows carrying one attribute into a card apiece", () => {
    const sciFi = buildAttributeIndex(trekLibrary()).find(
      (entry) => entry.category === "genre" && entry.value === "Sci-Fi",
    )!;
    const works = attributeWorks(trekLibrary(), sciFi, TODAY);

    // The three seasons are one show; the film and the book stand beside it, newest first.
    expect(works.map((work) => work.medium)).toEqual(["book", "show", "movie"]);
  });
});
