import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { toOmniItems, type OmniItem } from "../../src/omnibus/adapter";
import { crossingEntries, crossings } from "../../src/omnibus/crossingsData";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { season, show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

const TODAY = YearMonthDay.get(2025, 12, 31);

const showWith = (name: string, franchise: string, start: number) => {
  const parent = show({ name, franchise, startDate: YearMonthDay.get(start, 3, 1) });
  parent.s = [season(parent, { startDate: YearMonthDay.get(start, 3, 1), endDate: YearMonthDay.get(start, 6, 1) })];
  return parent;
};

const found = (items: OmniItem[]) => crossings(items, TODAY).found;

describe("which franchises get a strip", () => {
  it("keeps a franchise the reader met in more than one medium", () => {
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Breath of the Wild", franchise: "Zelda" })],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );

    expect(result.map((crossing) => crossing.franchise)).toEqual(["Zelda"]);
    expect(result[0].media).toEqual(["game", "movie"]);
  });

  it("keeps a franchise held by one medium alone, on that medium's lane", () => {
    // Requiring a second medium is a step change rather than a threshold: a series accrues its
    // entries unseen and one entry logged elsewhere then admits all of them at full size. It also
    // hid the largest series on the page, thirty seasons of a show with no game beside it.
    const result = found(
      toOmniItems(
        library({
          games: [
            videoGame({ name: "Breath of the Wild", franchise: "Zelda" }),
            videoGame({ name: "Tears of the Kingdom", franchise: "Zelda" }),
          ],
        }),
      ),
    );

    expect(result.map((crossing) => crossing.franchise)).toEqual(["Zelda"]);
    expect(result[0].media).toEqual(["game"]);
    expect(result[0].entries).toBe(2);
  });

  it("keeps a series' founding entry, which names the franchise its siblings also sit in", () => {
    // The home tabs' own strips draw "Alien" inside the Alien franchise, because whether a
    // franchise is real is a property of the group. Skipping the entry instead would leave this
    // lane holding the sequels alone while the Movies tab shows all three.
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Alien: Isolation", franchise: "Alien" })],
          movies: [movie({ name: "Alien", franchise: "Alien" }), movie({ name: "Aliens", franchise: "Alien" })],
        }),
      ),
    );

    expect(result[0].entries).toBe(3);
    expect(result[0].bands.filter((band) => band.item.medium === "movie")).toHaveLength(2);
  });

  it("drops a group in which every entry only repeats the franchise name", () => {
    // No entry anywhere in the group names a wider series, so the group is a title repeated rather
    // than a franchise. This is the one test a group has to pass, and it is what holds the section
    // to series: most franchise cells in the sheets are a work naming itself.
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Arrival", franchise: "Arrival" })],
          movies: [movie({ name: "Arrival", franchise: "Arrival" })],
        }),
      ),
    );

    expect(result).toEqual([]);
  });

  it("skips the empty franchise, which is the sheets' way of saying there is no series", () => {
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ franchise: "" })],
          movies: [movie({ franchise: "" })],
        }),
      ),
    );

    expect(result).toEqual([]);
  });

  it("orders the biggest crossing first, which is where the cut for display falls", () => {
    const result = found(
      toOmniItems(
        library({
          games: [
            videoGame({ name: "Breath of the Wild", franchise: "Zelda" }),
            videoGame({ name: "Casino Royale Game", franchise: "Bond" }),
          ],
          shows: [showWith("Zelda: The Show", "Zelda", 2016)],
          movies: [
            movie({ name: "Zelda: The Movie", franchise: "Zelda" }),
            movie({ name: "Skyfall", franchise: "Bond" }),
          ],
        }),
      ),
    );

    expect(result.map((crossing) => crossing.franchise)).toEqual(["Zelda", "Bond"]);
    expect(crossingEntries(result)).toBe(5);
  });
});

describe("how a crossing is laid out", () => {
  it("gives each medium its own lanes, in the order the page names the media", () => {
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Breath of the Wild", franchise: "Zelda" })],
          shows: [showWith("Zelda: The Show", "Zelda", 2016)],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );

    expect(result[0].laneCount).toBe(3);
    expect(result[0].bands.map((band) => [band.item.medium, band.lane])).toEqual([
      ["game", 0],
      ["show", 1],
      ["movie", 2],
    ]);
  });

  it("offsets a medium past every lane the media above it opened", () => {
    // Two playthroughs running at once take two lanes, so the film below them belongs on the
    // third — the arithmetic a renderer computing it from a medium's index would get wrong.
    const result = found(
      toOmniItems(
        library({
          games: [
            videoGame({
              name: "Breath of the Wild",
              franchise: "Zelda",
              startDate: YearMonthDay.get(2017, 3, 3),
              endDate: YearMonthDay.get(2019, 3, 3),
            }),
            videoGame({
              name: "Tears of the Kingdom",
              franchise: "Zelda",
              startDate: YearMonthDay.get(2018, 3, 3),
              endDate: YearMonthDay.get(2020, 3, 3),
            }),
          ],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );

    expect(result[0].laneCount).toBe(3);
    expect(result[0].bands.find((band) => band.item.medium === "movie")!.lane).toBe(2);
  });

  it("draws a film as a point in time, at the strip's minimum band width", () => {
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Breath of the Wild", franchise: "Zelda" })],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );
    const film = result[0].bands.find((band) => band.item.medium === "movie")!;

    expect(film.start).toBe(film.end);
    expect(film.widthPercent).toBeCloseTo(0.5);
    expect(film.precise).toBe(true);
  });

  it("marks a year-only game span as an estimate, since the sheet holds no day for it", () => {
    const result = found(
      toOmniItems(
        library({
          games: [
            videoGame({
              name: "Breath of the Wild",
              franchise: "Zelda",
              startDate: Year.get(2017),
              endDate: Year.get(2017),
            }),
          ],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );
    const game = result[0].bands.find((band) => band.item.medium === "game")!;

    expect(game.precise).toBe(false);
    expect(game.start).toBe(YearMonthDay.get(2017, 1, 1));
    expect(game.end).toBe(YearMonthDay.get(2017, 12, 31));
  });

  it("runs a game with no end date to the day the strip is drawn for", () => {
    const result = found(
      toOmniItems(
        library({
          games: [videoGame({ name: "Breath of the Wild", franchise: "Zelda", endDate: undefined })],
          movies: [movie({ name: "Zelda: The Movie", franchise: "Zelda" })],
        }),
      ),
    );

    expect(result[0].bands.find((band) => band.item.medium === "game")!.end).toBe(TODAY);
  });

  it("opens the scale where the earliest entry starts, not where its attribution year falls", () => {
    // An item counts to the year it *ended*, so a game begun in 1995 and finished in 2001 is a
    // 2001 item. A scale opened on that year would clamp six years of the band flat against the
    // left edge, drawn as a band beginning on the epoch with nothing saying it did not.
    const result = crossings(
      toOmniItems(
        library({
          games: [
            videoGame({
              name: "GoldenEye",
              franchise: "Bond",
              startDate: YearMonthDay.get(1995, 6, 1),
              endDate: YearMonthDay.get(2001, 6, 1),
            }),
          ],
          movies: [movie({ name: "Skyfall", franchise: "Bond", startDate: YearMonthDay.get(2003, 6, 1) })],
        }),
      ),
      TODAY,
    );
    const game = result.found[0].bands.find((band) => band.item.medium === "game")!;

    expect(result.epoch).toBe(YearMonthDay.get(1995, 1, 1));
    // Its own June rather than the strip's left edge, which is what a clamped span reads as.
    expect(game.startPercent).toBeGreaterThan(0);
    expect(game.widthPercent).toBeGreaterThan(15);
  });

  it("measures every crossing against one scale, so two of them can be read side by side", () => {
    // One epoch for every strip rather than each group's own, which is what stops a three-year
    // franchise and a twenty-year one being drawn at the same width.
    const result = found(
      toOmniItems(
        library({
          games: [
            videoGame({
              name: "Breath of the Wild",
              franchise: "Zelda",
              startDate: YearMonthDay.get(2010, 1, 1),
              endDate: YearMonthDay.get(2010, 1, 1),
            }),
            videoGame({
              name: "Casino Royale Game",
              franchise: "Bond",
              startDate: YearMonthDay.get(2010, 1, 1),
              endDate: YearMonthDay.get(2010, 1, 1),
            }),
          ],
          movies: [
            movie({ name: "Zelda: The Movie", franchise: "Zelda", startDate: YearMonthDay.get(2012, 6, 1) }),
            movie({ name: "Skyfall", franchise: "Bond", startDate: YearMonthDay.get(2012, 6, 1) }),
          ],
        }),
      ),
    );
    const [zelda, bond] = result;

    expect(zelda.bands[0].startPercent).toBeCloseTo(bond.bands[0].startPercent);
  });
});

describe("a book on a strip", () => {
  it("is a precise span from its start to its end, running to today while it is open", () => {
    const [crossing] = found(
      toOmniItems(
        library({
          movies: [
            movie({
              name: "Ready Player One",
              franchise: "Ready Player One",
              startDate: YearMonthDay.get(2018, 4, 28),
            }),
          ],
          books: [
            book({
              name: "Ready Player Two",
              franchise: "Ready Player One",
              startDate: YearMonthDay.get(2021, 3, 1),
              endDate: undefined,
              status: "Reading",
            }),
          ],
        }),
      ),
    );

    expect(crossing.media).toEqual(["movie", "book"]);
    const span = crossing.bands.find((band) => band.item.medium === "book")!;
    expect(span.precise).toBe(true);
    expect(span.start).toBe(YearMonthDay.get(2021, 3, 1));
    expect(span.end).toBe(TODAY);
  });
});
