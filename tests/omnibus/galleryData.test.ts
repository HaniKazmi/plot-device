import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { toOmniItems, type Library } from "../../src/omnibus/adapter";
import {
  GALLERY_CATEGORIES,
  galleryColour,
  galleryGroups,
  galleryItems,
  galleryStripOrder,
  galleryValue,
} from "../../src/omnibus/galleryData";
import { genreToColour } from "../../src/utils/types";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const library = (overrides: Partial<Library> = {}): Library => ({ games: [], shows: [], movies: [], ...overrides });

const showWithSeason = (overrides = {}) => {
  const parent = show(overrides);
  parent.s = [season(parent, { startDate: parent.startDate, endDate: YearMonthDay.get(2022, 6, 1) })];
  return parent;
};

describe("what a shelf is", () => {
  it("groups by a field all three media record, so none of them can vanish off the wall", () => {
    // `groupByCategory` skips an empty value, so a category one medium answers "" to would drop
    // that medium out of the gallery silently rather than visibly.
    const items = toOmniItems(library({ games: [videoGame()], shows: [showWithSeason()], movies: [movie()] }));

    for (const category of GALLERY_CATEGORIES) {
      expect(items.every((item) => galleryValue(item, category) !== "")).toBe(true);
    }
  });

  it("reads a decade as the decade the reader met it, which is the only one shows carry", () => {
    // A show has no release date anywhere in the model, so a release decade over the union would
    // be a shelf two media stand on. The attribution year is total.
    const [item] = toOmniItems(
      library({
        movies: [movie({ releaseDate: YearMonthDay.get(1999, 3, 31), startDate: YearMonthDay.get(2018, 7, 4) })],
      }),
    );

    expect(galleryValue(item, "decade")).toBe("2010s");
  });

  it("marks a shelf only where the app already paints that field", () => {
    // A swatch on a field with no colour vocabulary teaches a legend no chart honours, and there is
    // no cross-media franchise vocabulary — each tab colours its own.
    expect(galleryColour("Sci-Fi", "genre")).toBe(genreToColour("Sci-Fi"));
    expect(galleryColour("Severance", "franchise")).toBeUndefined();
  });
});

describe("what the gallery can draw", () => {
  it("keeps only what has artwork, because a picture is the whole of a card here", () => {
    const items = toOmniItems(library({ games: [videoGame(), videoGame({ banner: undefined })] }));

    expect(galleryItems(items)).toHaveLength(1);
  });

  it("has nothing to draw for a library with no artwork at all", () => {
    // The rail's chip is gated on this, so a page with nothing on the wall offers no chip to it.
    expect(galleryItems(toOmniItems(library({ games: [videoGame({ banner: undefined })] })))).toEqual([]);
  });
});

describe("shelving", () => {
  const items = () =>
    toOmniItems(
      library({
        games: [
          videoGame({ name: "Halo", genre: "Shooter", hours: 40 }),
          videoGame({ name: "Halo 2", genre: "Shooter", hours: 10 }),
        ],
        movies: [movie({ name: "Arrival", genre: "Sci-Fi", minutes: 120 })],
      }),
    );

  it("orders shelves by the page's measure, largest first", () => {
    const groups = galleryGroups(items(), "genre", "Hours");

    expect(groups.map((group) => group.name)).toEqual(["Shooter", "Sci-Fi"]);
    expect(groups[0].count).toBe(50);
  });

  it("reorders them under Items, where a fifty-hour game counts what a two-hour film does", () => {
    const groups = galleryGroups(items(), "genre", "Items");

    expect(groups.map((group) => group.count)).toEqual([2, 1]);
  });

  it("fronts a shelf with its biggest entry, which is also the first picture on it", () => {
    const groups = galleryGroups(items(), "genre", "Hours");

    expect(groups[0].top.name).toBe("Halo");
    expect(galleryStripOrder(groups[0].all)[0].name).toBe("Halo");
  });

  it("drops a franchise shelf holding one entry, which is an item naming itself", () => {
    // The franchise column repeats a standalone title, so a group of one is not a series — the
    // rule the three home tabs already group by.
    const groups = galleryGroups(items(), "franchise", "Hours");

    expect(groups.map((group) => group.name)).not.toContain("Arrival");
  });

  it("stands a show on a shelf once, however many seasons of it there are", () => {
    // The wall draws one banner per show, so a season each would be the same picture repeated
    // until it crowded every other show off the strip.
    const parent = show();
    parent.s = [
      season(parent, { endDate: YearMonthDay.get(2022, 6, 1), minutes: 600 }),
      season(parent, { endDate: YearMonthDay.get(2023, 6, 1), minutes: 300 }),
    ];
    const [group] = galleryGroups(toOmniItems(library({ shows: [parent] })), "genre", "Items");

    expect(group.all).toHaveLength(1);
    expect(group.count).toBe(1);
  });

  it("still counts every season's hours behind that one card", () => {
    // Items counts works and Hours counts time: collapsing the cards must not quietly drop the
    // seasons those cards stand for.
    const parent = show();
    parent.s = [
      season(parent, { endDate: YearMonthDay.get(2022, 6, 1), minutes: 600 }),
      season(parent, { endDate: YearMonthDay.get(2023, 6, 1), minutes: 300 }),
    ];
    const [group] = galleryGroups(toOmniItems(library({ shows: [parent] })), "genre", "Hours");

    expect(group.count).toBe(15);
  });

  it("stands it on each decade it was met in, since a shelf is collapsed within itself", () => {
    const parent = show({ startDate: YearMonthDay.get(2019, 2, 18) });
    parent.s = [
      season(parent, { endDate: YearMonthDay.get(2019, 6, 1) }),
      season(parent, { endDate: YearMonthDay.get(2022, 6, 1) }),
    ];
    const groups = galleryGroups(toOmniItems(library({ shows: [parent] })), "decade", "Items");

    expect(groups.map((group) => group.name).toSorted()).toEqual(["2010s", "2020s"]);
    expect(groups.every((group) => group.all.length === 1)).toBe(true);
  });

  it("shows a rewatched film once, where two viewings are two rows of one work", () => {
    const rewatched = library({
      movies: [movie({ startDate: YearMonthDay.get(2017, 1, 14) }), movie({ startDate: YearMonthDay.get(2021, 9, 2) })],
    });

    expect(galleryGroups(toOmniItems(rewatched), "genre", "Items")[0].count).toBe(1);
  });

  it("keeps a shelf whose members it does group", () => {
    const grouped = toOmniItems(
      library({
        games: [
          videoGame({ name: "Halo", franchise: "Halo", hours: 40 }),
          videoGame({ name: "Halo 2", franchise: "Halo", hours: 10 }),
        ],
      }),
    );

    expect(galleryGroups(grouped, "franchise", "Hours").map((group) => group.name)).toEqual(["Halo"]);
  });
});
