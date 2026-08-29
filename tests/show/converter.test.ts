import { afterEach, describe, expect, it, vi } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { jsonConverter } from "../../src/show/converter";
import { seasonRow, showRow } from "../fixtures/showRows";

afterEach(() => vi.restoreAllMocks());

describe("flattening the sheet into nested shows", () => {
  it("opens a show on a non-empty Show cell and attaches the rows after it as seasons", () => {
    const [show] = jsonConverter([
      showRow({ Show: "Severance" }),
      seasonRow({ Season: "1", Episode: "9" }),
      seasonRow({ Season: "2", Episode: "10", Start: "2025-01-17", End: "2025-03-21" }),
    ]);

    expect(show.name).toBe("Severance");
    expect(show.s.map((s) => s.s)).toEqual([1, 2]);
  });

  it("starts a new show at the next non-empty Show cell", () => {
    const shows = jsonConverter([
      showRow({ Show: "Severance" }),
      seasonRow(),
      showRow({ Show: "Andor" }),
      seasonRow({ Start: "2022-09-21", End: "2022-11-23" }),
    ]);

    expect(shows.map((s) => s.name)).toEqual(["Severance", "Andor"]);
    expect(shows.map((s) => s.s.length)).toEqual([1, 1]);
  });

  it("links every season back to its own parent", () => {
    // Sunburst reaches through this back-reference for every non-date grouping key, so it is
    // load-bearing for rendering and not just for the model.
    const [show] = jsonConverter([showRow(), seasonRow({ Season: "1" }), seasonRow({ Season: "2" })]);

    expect(show.s.every((season) => season.show === show)).toBe(true);
  });

  it("reads anime only from the literal string TRUE", () => {
    const anime = (value: string) => jsonConverter([showRow({ Anime: value }), seasonRow()])[0].anime;

    expect(anime("TRUE")).toBe(true);
    expect(anime("true")).toBe(false);
    expect(anime("")).toBe(false);
  });
});

describe("rolling season totals up into the show", () => {
  const twoSeasons = () => [
    showRow(),
    seasonRow({ Season: "1", Episode: "9", Start: "2022-02-18", End: "2022-04-08", Episodes: "45" }),
    seasonRow({ Season: "2", Episode: "10", Start: "2025-01-17", End: "2025-03-21", Episodes: "50" }),
  ];

  it("sums episodes and minutes across seasons", () => {
    const [show] = jsonConverter(twoSeasons());

    expect(show.e).toBe(19);
    expect(show.minutes).toBe(9 * 45 + 10 * 50);
  });

  it("takes the start date from the first season and the end date from the last", () => {
    const [show] = jsonConverter(twoSeasons());

    expect(show.startDate).toBe(YearMonthDay.get(2022, 2, 18));
    expect(show.endDate).toBe(YearMonthDay.get(2025, 3, 21));
  });

  it("leaves the show open while the final season is unfinished, even if earlier ones ended", () => {
    // endDate is the last season's, not the maximum, so a currently-airing season hides the
    // fact that the show has any completed run at all.
    const [show] = jsonConverter([
      showRow(),
      seasonRow({ Season: "1", Start: "2022-02-18", End: "2022-04-08" }),
      seasonRow({ Season: "2", Start: "2025-01-17", End: "" }),
    ]);

    expect(show.endDate).toBeUndefined();
  });

  it("depends on sheet order, taking the first row rather than the earliest date", () => {
    const [show] = jsonConverter([
      showRow(),
      seasonRow({ Season: "2", Start: "2025-01-17", End: "2025-03-21" }),
      seasonRow({ Season: "1", Start: "2022-02-18", End: "2022-04-08" }),
    ]);

    expect(show.startDate).toBe(YearMonthDay.get(2025, 1, 17));
  });
});

describe("season fields", () => {
  it("parses the season number as a float, so half seasons are representable", () => {
    const [show] = jsonConverter([showRow(), seasonRow({ Season: "1.5" })]);

    expect(show.s[0].s).toBe(1.5);
  });

  it("records minutes as 0 when the runtime column is blank, not undefined", () => {
    // An hours-based measure therefore under-reports these seasons rather than skipping them.
    const [show] = jsonConverter([showRow(), seasonRow({ Episodes: "" })]);

    expect(show.s[0].minutes).toBe(0);
    expect(show.minutes).toBe(0);
  });

  it("leaves a blank subtitle undefined, which is what the type has always claimed", () => {
    // The column is blank for most seasons, and an empty string would have every reader test for
    // it separately — or render an empty line.
    const [show] = jsonConverter([showRow(), seasonRow({ Subtitle: "" })]);

    expect(show.s[0].subtitle).toBeUndefined();
  });

  it("trims a padded subtitle, because the sheet has a few", () => {
    const [show] = jsonConverter([showRow(), seasonRow({ Subtitle: " Despair Arc" })]);

    expect(show.s[0].subtitle).toBe("Despair Arc");
  });

  it("keeps a subtitle that is there", () => {
    const [show] = jsonConverter([showRow(), seasonRow({ Subtitle: "Water" })]);

    expect(show.s[0].subtitle).toBe("Water");
  });

  it("counts an unparseable episode cell as 0 and says which row it was", () => {
    // Left as NaN it would propagate through the show's episode total and every statistic
    // derived from it, blanking numbers nowhere near the row at fault.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const [show] = jsonConverter([showRow({ Show: "Severance" }), seasonRow({ Season: "1", Episode: "" })]);

    expect(show.s[0].e).toBe(0);
    expect(show.e).toBe(0);
    expect(error).toHaveBeenCalledWith(expect.stringContaining('season 1 of "Severance"'));
    expect(error).toHaveBeenCalledWith(expect.stringContaining("counting it as 0"));
  });
});

describe("the 2005 cutoff", () => {
  it("drops a season that started in or before 2005 while keeping later ones", () => {
    const [show] = jsonConverter([
      showRow(),
      seasonRow({ Season: "1", Start: "2004-01-01", End: "2004-06-01" }),
      seasonRow({ Season: "2", Start: "2022-02-18", End: "2022-04-08" }),
    ]);

    expect(show.s.map((s) => s.s)).toEqual([2]);
  });

  it("throws by name when every season of a show falls before the cutoff", () => {
    // The cutoff gates the season push but not the show creation, so the show reaches the
    // rollup with nothing to summarise. That stays a hard failure — the sheet is wrong — but
    // it names the show rather than dereferencing undefined somewhere downstream.
    expect(() =>
      jsonConverter([showRow({ Show: "Lost" }), seasonRow({ Start: "2004-01-01", End: "2004-06-01" })]),
    ).toThrow('Show "Lost": has no seasons starting after 2005');
  });

  it("throws by name when a show has no season rows at all", () => {
    expect(() => jsonConverter([showRow({ Show: "Lost" })])).toThrow('Show "Lost"');
  });
});

describe("date ordering assertions", () => {
  it("reports an inverted date pair with both dates, and keeps the season", () => {
    // Logging does not alter control flow, so the bad row still enters the dataset — unlike
    // vg/, where an inverted pair throws out of the converter.
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    const [show] = jsonConverter([
      showRow({ Show: "Severance" }),
      seasonRow({ Season: "1", Start: "2022-04-08", End: "2022-02-18" }),
    ]);

    expect(error).toHaveBeenCalledWith(expect.stringContaining("starts 2022-04-08 but ends 2022-02-18"));
    expect(show.s).toHaveLength(1);
  });

  it("stays quiet for a correctly ordered run", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});

    jsonConverter([showRow(), seasonRow()]);

    expect(error).not.toHaveBeenCalled();
  });
});

describe("bad rows", () => {
  it("names the row and column when a season date will not parse", () => {
    expect(() => jsonConverter([showRow({ Show: "Severance" }), seasonRow({ Season: "1", Start: "" })])).toThrow(
      'Row 3, season 1 of "Severance", Start: Unkown Date Format',
    );
  });

  it("says so when a season row appears before any show", () => {
    expect(() => jsonConverter([seasonRow()])).toThrow("no show has been declared above it");
  });
});
