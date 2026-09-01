import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { jsonConverter } from "../../src/vg/converter";
import { vgRow } from "../fixtures/vgRows";

const convertOne = (overrides: Record<string, string> = {}) => jsonConverter([vgRow(overrides)])[0];

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

describe("the Party status", () => {
  it('folds "Party" into Endless plus a flag, because Party is not a Status', () => {
    const game = convertOne({ Status: "Party" });

    expect(game.status).toBe("Endless");
    expect(game.party).toBe(true);
  });

  it("leaves every other status alone with the flag off", () => {
    const game = convertOne({ Status: "Beat" });

    expect(game.status).toBe("Beat");
    expect(game.party).toBe(false);
  });

  it("makes party games invisible to an Endless filter, since they are now Endless", () => {
    const [party, endless] = jsonConverter([vgRow({ Status: "Party" }), vgRow({ Status: "Endless" })]);

    expect(party.status).toBe(endless.status);
  });
});

describe("field parsing", () => {
  it("splits a multi-line Theme cell into separate themes", () => {
    expect(convertOne({ Theme: "Fantasy\nMedieval" }).theme).toEqual(["Fantasy", "Medieval"]);
  });

  it("yields a single-element array for a Theme with no newline", () => {
    expect(convertOne({ Theme: "Fantasy" }).theme).toEqual(["Fantasy"]);
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

  it("is undefined when either end is year-only, rather than inventing a precision", () => {
    expect(convertOne({ "Start Date": "2007", "End Date": "2017-04-01" }).numDays).toBeUndefined();
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
    expect(() => convertOne({ Game: "Zelda", Gameplay: "Role-Playing" })).toThrow(
      'Row 2, "Zelda", Gameplay: "Role-Playing" is not a gameplay style',
    );
  });

  it("still defaults a blank genre, which is an exemption for rows not yet filled in", () => {
    // Deliberately unlike gameplay above: 10 of 340 rows have no genre, so this one column
    // tolerates a blank until the sheet catches up.
    expect(convertOne({ Genre: "" }).genre).toBe("Other");
  });
});

describe("bad rows", () => {
  it("throws on a blank start date instead of dropping the row", () => {
    // Unlike movie/, this converter filters nothing, so a trailing blank row reaches here.
    expect(() => convertOne({ "Start Date": "" })).toThrow("Unkown Date Format");
  });

  it("throws on a partial date, because only full dates and bare years parse", () => {
    expect(() => convertOne({ "Start Date": "2017-03" })).toThrow("Unkown Date Format");
  });

  it("names the sheet row, the game and the column that failed", () => {
    expect(() => convertOne({ Game: "Zelda", "Start Date": "" })).toThrow('Row 2, "Zelda", Start Date');
    expect(() => convertOne({ Game: "Zelda", Release: "" })).toThrow('Row 2, "Zelda", Release');
  });

  it("counts sheet rows past the header, so the number matches what is on screen", () => {
    const rows = [vgRow(), vgRow(), vgRow({ Game: "Broken", "Start Date": "" })];

    expect(() => jsonConverter(rows)).toThrow('Row 4, "Broken"');
  });

  it("names both dates when the pair is inverted", () => {
    expect(() => convertOne({ Game: "Zelda", "Start Date": "2017-04-01", "End Date": "2017-03-03" })).toThrow(
      'Row 2, "Zelda", played 2017-04-01 to 2017-03-03: Invalid comparison',
    );
  });
});
