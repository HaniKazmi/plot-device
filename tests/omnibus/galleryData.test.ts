import { describe, expect, it } from "vitest";
import { CURRENT_PLAINDATE, YearMonthDay } from "../../src/common/date";
import { toOmniItems, type Library } from "../../src/omnibus/adapter";
import {
  GALLERY_CATEGORIES,
  GALLERY_SORTS,
  galleryColour,
  galleryGroups,
  galleryItems,
  galleryStripOrder,
  galleryValue,
} from "../../src/omnibus/galleryData";
import { ageRatingToColour, genreToColour } from "../../src/utils/types";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const library = (overrides: Partial<Library> = {}): Library => ({ games: [], shows: [], movies: [], ...overrides });

// What an open item is dated at, which is what the app passes. Every fixture below closes, so
// nothing here is compared against it — a shelf's order is read off the dates the rows carry.
const TODAY = CURRENT_PLAINDATE;

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

  it("shelves a rating by its age band, so one tier is not two shelves in two notations", () => {
    // Games record PEGI and the other two BBFC, so the raw cell splits every tier by its suffix —
    // and the halves are then drawn in the same colour beside each other. The cards themselves
    // still state the certificate their own row carries.
    const [game] = toOmniItems(library({ games: [videoGame({ rating: "16+" })] }));
    const [film] = toOmniItems(library({ movies: [movie({ rating: "15" })] }));

    expect(galleryValue(game, "rating")).toBe(galleryValue(film, "rating"));
    expect(game.rating).toBe("16+");
    expect(film.rating).toBe("15");
  });

  it("marks a shelf only where the app already paints that field", () => {
    // A swatch on a field with no colour vocabulary teaches a legend no chart honours, and there is
    // no cross-media franchise vocabulary — each tab colours its own.
    expect(galleryColour("Sci-Fi", "genre")).toBe(genreToColour("Sci-Fi"));
    expect(
      galleryColour(
        galleryValue(toOmniItems(library({ games: [videoGame({ rating: "16+" })] }))[0], "rating"),
        "rating",
      ),
    ).toBe(ageRatingToColour("15"));
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
    const groups = galleryGroups(items(), "genre", "Hours", "size", TODAY);

    expect(groups.map((group) => group.name)).toEqual(["Shooter", "Sci-Fi"]);
    expect(groups[0].count).toBe(50);
  });

  it("reorders them under Items, where a fifty-hour game counts what a two-hour film does", () => {
    const groups = galleryGroups(items(), "genre", "Items", "size", TODAY);

    expect(groups.map((group) => group.count)).toEqual([2, 1]);
  });

  it("fronts a shelf with its biggest entry, which is also the first picture on it", () => {
    const groups = galleryGroups(items(), "genre", "Hours", "size", TODAY);

    expect(groups[0].top.name).toBe("Halo");
    expect(galleryStripOrder(groups[0].all, "size")[0].name).toBe("Halo");
  });

  it("drops a franchise shelf holding one entry, which is an item naming itself", () => {
    // The franchise column repeats a standalone title, so a group of one is not a series — the
    // rule the three home tabs already group by.
    const groups = galleryGroups(items(), "franchise", "Hours", "size", TODAY);

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
    const [group] = galleryGroups(toOmniItems(library({ shows: [parent] })), "genre", "Items", "size", TODAY);

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
    const [group] = galleryGroups(toOmniItems(library({ shows: [parent] })), "genre", "Hours", "size", TODAY);

    expect(group.count).toBe(15);
  });

  it("stands it on each decade it was met in, since a shelf is collapsed within itself", () => {
    const parent = show({ startDate: YearMonthDay.get(2019, 2, 18) });
    parent.s = [
      season(parent, { endDate: YearMonthDay.get(2019, 6, 1) }),
      season(parent, { endDate: YearMonthDay.get(2022, 6, 1) }),
    ];
    const groups = galleryGroups(toOmniItems(library({ shows: [parent] })), "decade", "Items", "size", TODAY);

    expect(groups.map((group) => group.name).toSorted()).toEqual(["2010s", "2020s"]);
    expect(groups.every((group) => group.all.length === 1)).toBe(true);
  });

  it("shows a rewatched film once, where two viewings are two rows of one work", () => {
    const rewatched = library({
      movies: [movie({ startDate: YearMonthDay.get(2017, 1, 14) }), movie({ startDate: YearMonthDay.get(2021, 9, 2) })],
    });

    expect(galleryGroups(toOmniItems(rewatched), "genre", "Items", "size", TODAY)[0].count).toBe(1);
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

    expect(galleryGroups(grouped, "franchise", "Hours", "size", TODAY).map((group) => group.name)).toEqual(["Halo"]);
  });
});

describe("ordering the shelves", () => {
  const spanningShow = () => {
    const parent = show({ name: "Spanning", genre: "Drama", startDate: YearMonthDay.get(2010, 1, 1) });
    parent.s = [
      // The big season is the old one, so a work's recency and its representative differ.
      season(parent, { endDate: YearMonthDay.get(2011, 6, 1), minutes: 6000 }),
      season(parent, { endDate: YearMonthDay.get(2024, 6, 1), minutes: 60 }),
    ];
    return parent;
  };

  const mixed = () =>
    toOmniItems(
      library({
        games: [videoGame({ name: "Halo", genre: "Shooter", hours: 40, endDate: YearMonthDay.get(2015, 3, 2) })],
        shows: [spanningShow()],
        movies: [movie({ name: "Arrival", genre: "Sci-Fi", minutes: 120, startDate: YearMonthDay.get(2026, 2, 1) })],
      }),
    );

  it("puts the shelf met most recently first, where size would put the largest", () => {
    const bySize = galleryGroups(mixed(), "genre", "Hours", "size", TODAY);
    const byRecency = galleryGroups(mixed(), "genre", "Hours", "recent", TODAY);

    expect(bySize.map((group) => group.name)).toEqual(["Drama", "Shooter", "Sci-Fi"]);
    expect(byRecency.map((group) => group.name)).toEqual(["Sci-Fi", "Drama", "Shooter"]);
  });

  it("dates a work by its last entry, not by the entry that fronts it", () => {
    // The representative is the biggest member, so a show that was huge in its first season and
    // closed quietly years later would otherwise be shelved under the year it was big in.
    const [drama] = galleryGroups(toOmniItems(library({ shows: [spanningShow()] })), "genre", "Hours", "recent", TODAY);

    expect(drama.all[0].year).toBe(2011);
    expect(drama.metDate.toString()).toBe("2024-06-01");
  });

  it("dates an item that has not closed as met now, since that is when it is being met", () => {
    // An open item is what the reader is in the middle of. Sorting it by the day it started would
    // put a game begun two years ago behind everything finished since.
    const open = toOmniItems(
      library({
        games: [
          videoGame({ name: "Playing", genre: "Shooter", endDate: undefined, startDate: YearMonthDay.get(2019, 1, 1) }),
        ],
        movies: [movie({ name: "Arrival", genre: "Sci-Fi", startDate: YearMonthDay.get(2026, 2, 1) })],
      }),
    );

    expect(galleryGroups(open, "genre", "Items", "recent", TODAY).map((group) => group.name)).toEqual([
      "Shooter",
      "Sci-Fi",
    ]);
  });

  it("keeps the measure on the card whichever way the shelves are ordered", () => {
    // The sort decides the order and never the figure: a shelf still states its own hours.
    const [shelf] = galleryGroups(mixed(), "genre", "Hours", "recent", TODAY);

    expect(shelf.name).toBe("Sci-Fi");
    expect(shelf.count).toBe(2);
  });

  it("orders the pictures the way it orders the shelves, and fronts the shelf with the first", () => {
    // A gallery whose shelves came newest first while every strip still led with a decade-old
    // entry would be answering both questions at once.
    const shooter = toOmniItems(
      library({
        games: [
          videoGame({ name: "Halo", genre: "Shooter", hours: 40, endDate: YearMonthDay.get(2015, 3, 2) }),
          videoGame({ name: "Halo 2", genre: "Shooter", hours: 10, endDate: YearMonthDay.get(2024, 5, 9) }),
        ],
      }),
    );

    const [bySize] = galleryGroups(shooter, "genre", "Hours", "size", TODAY);
    const [byRecency] = galleryGroups(shooter, "genre", "Hours", "recent", TODAY);

    expect(bySize.all.map((item) => item.name)).toEqual(["Halo", "Halo 2"]);
    expect(byRecency.all.map((item) => item.name)).toEqual(["Halo 2", "Halo"]);
    expect(bySize.top.name).toBe("Halo");
    expect(byRecency.top.name).toBe("Halo 2");
  });

  it("leaves a show standing on each decade it was met in, whichever sort is on", () => {
    // The recency travels beside the attribution year rather than over it: written over it, both
    // copies of a decade-spanning show would claim the later decade and empty the earlier shelf.
    for (const sort of GALLERY_SORTS) {
      const groups = galleryGroups(toOmniItems(library({ shows: [spanningShow()] })), "decade", "Items", sort, TODAY);

      expect(groups.map((group) => group.name).toSorted()).toEqual(["2010s", "2020s"]);
    }
  });
});
