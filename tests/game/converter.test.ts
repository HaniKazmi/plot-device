import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { gameDataConfig, jsonConverter } from "../../src/game/converter";
import { gameRow } from "../fixtures/gameRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([gameRow(overrides)])[0];

describe("company", () => {
  it("takes the first word of the platform, so consoles collapse to their maker", () => {
    expect(convertOne({ Platform: "Xbox 360" }).company).toBe("Xbox");
    expect(convertOne({ Platform: "PlayStation P" }).company).toBe("PlayStation");
  });

  it("keeps a single-word platform as its own company", () => {
    expect(convertOne({ Platform: "PC" }).company).toBe("PC");
    expect(convertOne({ Platform: "iOS" }).company).toBe("iOS");
  });

  it("produces an off-union company for a platform whose first word is new", () => {
    // Nothing validates the split, so a new maker reaches the colour lookups as a live value.
    expect(convertOne({ Platform: "Sega Saturn" }).company).toBe("Sega");
  });
});

describe("the status", () => {
  it("rejects a status outside the vocabulary, naming the row, rather than casting it past the colour table", () => {
    expect(() => convertOne({ Title: "Zelda", Status: "Party" })).toThrow(
      'Row 2, "Zelda", Status: "Party" is not a status',
    );
  });

  it("answers the vocabulary's own spelling", () => {
    expect(convertOne({ Status: "endless" }).status).toBe("Endless");
  });
});

describe("field parsing", () => {
  it("splits the Themes cell on the comma the sheet separates them with", () => {
    expect(convertOne({ Themes: "Crime, Mystery, Visual Novel" }).themes).toEqual(["Crime", "Mystery", "Visual Novel"]);
    expect(convertOne({ Themes: "Fantasy" }).themes).toEqual(["Fantasy"]);
  });

  it("gives a game with no theme an empty list, not a list holding an empty string", () => {
    // 12 of 340 games carry no theme, and `[""]` would put a themeless game under a theme named
    // by the empty string on every surface that groups by one.
    expect(convertOne({ Themes: "" }).themes).toEqual([]);
  });

  it("rejects a missing Themes column rather than reading it as a game with no themes", () => {
    // The two are the same value under `splitCell` and mean opposite things: 12 games honestly
    // have none, but `Themes` sits ten columns before the last, so an absent key means the column
    // itself is gone. `themes.includes("Adult")` is what guest mode hides on, so reading the
    // second as the first puts every adult game back on screen without a word.
    const row = gameRow();
    delete row.Themes;

    expect(() => jsonConverter([row])).toThrow('Row 2, "Breath of the Wild", Themes: the column is missing');
  });

  it("reads the series and its number, a blank cell arriving as the absence the model declares", () => {
    expect(convertOne().series).toBe("");
    expect(convertOne().seriesNumber).toBeUndefined();
    expect(convertOne({ Series: "Zelda", "Series #": "17" }).seriesNumber).toBe(17);
  });

  it("keeps a fractional series number, which orders an entry between two numbered ones", () => {
    // Final Fantasy VII Remake and Rebirth are 7 and 7.1: truncated, the two tie.
    expect(convertOne({ Series: "Final Fantasy", "Series #": "7.1" }).seriesNumber).toBe(7.1);
  });

  it("leaves hours undefined rather than NaN when the cell is blank", () => {
    expect(convertOne({ Hours: "" }).hours).toBeUndefined();
    expect(convertOne({ Hours: "50" }).hours).toBe(50);
  });

  it("leaves endDate undefined for a game still in progress", () => {
    const game = convertOne({ "End Date": "" });

    expect(game.endDate).toBeUndefined();
    expect(game.numDays).toBeUndefined();
  });

  it("interns dates, so equal dates are the same object", () => {
    // Barchart keys a Map by date instance; without interning every row would open its own
    // column.
    expect(convertOne().startDate).toBe(YearMonthDay.get(2017, 3, 3));
  });
});

describe("numDays", () => {
  it("counts both endpoints, so a game started and finished in one day is 1 day", () => {
    const game = convertOne({ "Start Date": "2017-03-03", "End Date": "2017-03-03" });

    expect(game.numDays).toBe(1);
  });

  it("counts inclusively across a month boundary", () => {
    // 30 days of March from the 3rd, plus the 1st of April.
    expect(convertOne({ "Start Date": "2017-03-03", "End Date": "2017-04-01" }).numDays).toBe(30);
  });

  it("counts inclusively across a year boundary", () => {
    expect(convertOne({ "Start Date": "2016-12-31", "End Date": "2017-01-01" }).numDays).toBe(2);
  });

  it("rejects a bare year at either end, naming the cell, since the model places a game on a day", () => {
    // Cast through instead, a `Year` reaches a chart placing it on a day scale, where it compares
    // as a shorter string and drops the row with nothing said.
    expect(() => convertOne({ Title: "Zelda", "Start Date": "2007", "End Date": "2007-04-01" })).toThrow(
      'Row 2, "Zelda", Start Date: "2007" is a bare year, not a full date',
    );
    expect(() => convertOne({ Title: "Zelda", "Start Date": "2020-01-15", "End Date": "2020" })).toThrow(
      'Row 2, "Zelda", End Date: "2020" is a bare year, not a full date',
    );
    expect(() => convertOne({ Title: "Zelda", "Start Date": "2007", "End Date": "" })).toThrow(
      'Row 2, "Zelda", Start Date: "2007" is a bare year, not a full date',
    );
  });

  it("throws when the end date precedes the start date", () => {
    // The whole converter fails, so one transposed row takes the tab down rather than
    // reporting a negative duration.
    expect(() => convertOne({ "Start Date": "2017-04-01", "End Date": "2017-03-03" })).toThrow("Invalid comparison");
  });
});

describe("genre and gameplay", () => {
  it("keeps the two vocabularies in their own fields", () => {
    // The sheet holds both, and the columns are adjacent: reading either into the other's field
    // colours a value against a ramp that has no entry for it, silently, on every chart at once.
    const game = convertOne({ Genre: "Fantasy", Gameplay: "Role Playing" });
    expect(game.genre).toBe("Fantasy");
    expect(game.gameplay).toBe("Role Playing");
  });

  it("rejects a blank gameplay rather than letting an empty cell reach the tab", () => {
    // Cast unchecked it renders as a nameless filter chip and a ledger row with no value, which
    // reads as a style with no colour yet rather than as a cell nobody filled in.
    expect(() => convertOne({ Gameplay: "" })).toThrow('"" is not a gameplay style');
  });

  it("rejects a misspelt gameplay, naming the row so the sheet can be fixed", () => {
    expect(() => convertOne({ Title: "Zelda", Gameplay: "Role-Playing" })).toThrow(
      'Row 2, "Zelda", Gameplay: "Role-Playing" is not a gameplay style',
    );
  });

  it("reports the missing genre on a row the sheet truncated, not the first date it cannot parse", () => {
    // Genre sits left of the date columns, so a row nobody finished is missing those too. Read in
    // sheet order the dates complain first, about a cell that is only a symptom.
    expect(() => jsonConverter([{ Title: "Half", Platform: "PC" }])).toThrow('Row 2, "Half", Genre: no genre recorded');
  });

  it("rejects a blank genre the way it rejects a blank gameplay", () => {
    // The ramp answers the neutral for a genre it has no entry for, so a blank reaching a chart is
    // indistinguishable from a genre nobody has coloured yet. The row is only nameable here.
    expect(() => convertOne({ Title: "Zelda", Genre: "" })).toThrow('Row 2, "Zelda", Genre: no genre recorded');
  });
});

describe("style", () => {
  it("reads the Style cell into the game's style", () => {
    expect(convertOne({ Style: "Anime" }).style).toBe("Anime");
    expect(convertOne().style).toBe("Stylised");
  });

  it("rejects a blank or unknown style, naming the row", () => {
    // Checked as the other two sheets check theirs: the box folds "Anime" across the three tabs on
    // the word, so a cell off the list is a game missing from that shelf with nothing to say so.
    expect(() => convertOne({ Title: "Zelda", Style: "" })).toThrow('Row 2, "Zelda", Style: "" is not a style');
    expect(() => convertOne({ Style: "Cel-shaded" })).toThrow("is not a style");
  });
});

describe("bad rows", () => {
  it("throws on a blank start date instead of dropping the row", () => {
    // Unlike movie/, this converter filters nothing, so a trailing blank row reaches here.
    expect(() => convertOne({ "Start Date": "" })).toThrow("Unkown Date Format");
  });

  it("throws on a partial date", () => {
    expect(() => convertOne({ "Start Date": "2017-03" })).toThrow("Unkown Date Format");
  });

  it("names the sheet row, the game and the column that failed", () => {
    expect(() => convertOne({ Title: "Zelda", "Start Date": "" })).toThrow('Row 2, "Zelda", Start Date');
    expect(() => convertOne({ Title: "Zelda", "Release Date": "" })).toThrow('Row 2, "Zelda", Release Date');
    expect(() => convertOne({ Title: "Zelda", "Release Date": "2007" })).toThrow(
      'Row 2, "Zelda", Release Date: "2007" is a bare year, not a full date',
    );
  });

  it("counts sheet rows past the header, so the number matches what is on screen", () => {
    const rows = [gameRow(), gameRow(), gameRow({ Title: "Broken", "Start Date": "" })];

    expect(() => jsonConverter(rows)).toThrow('Row 4, "Broken"');
  });

  it("names both dates when the pair is inverted", () => {
    expect(() => convertOne({ Title: "Zelda", "Start Date": "2017-04-01", "End Date": "2017-03-03" })).toThrow(
      'Row 2, "Zelda", played 2017-04-01 to 2017-03-03: Invalid comparison',
    );
  });
});

describe("the cache config", () => {
  it("keys the cache on the domain and a version, so a shape change can bump it", () => {
    expect(gameDataConfig.storageKey).toBe("game-data-cache-v5");
    expect(gameDataConfig.converter).toBe(jsonConverter);
  });
});
