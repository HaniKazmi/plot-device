import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { describing, readFullDate, sheetError, sheetRow } from "../../src/common/sheetError";

describe("sheetRow", () => {
  it("turns a record index back into the row number the sheet shows", () => {
    // arrayToJson strips the header, so record 0 came from row 2.
    expect(sheetRow(0)).toBe(2);
    expect(sheetRow(41)).toBe(43);
  });
});

describe("describing", () => {
  it("passes a successful parse straight through", () => {
    expect(describing("Row 2", () => 42)).toBe(42);
  });

  it("prefixes a failure with what was being read", () => {
    expect(() =>
      describing('Row 7, "Zelda", Start Date', () => {
        throw new Error("Unkown Date Format: 2024-05");
      }),
    ).toThrow('Row 7, "Zelda", Start Date: Unkown Date Format: 2024-05');
  });

  it("keeps the original error as the cause, so the stack survives", () => {
    const original = new Error("boom");

    try {
      describing("Row 2", () => {
        throw original;
      });
      expect.unreachable();
    } catch (error) {
      expect((error as Error).cause).toBe(original);
    }
  });

  it("describes a thrown non-error too", () => {
    expect(() =>
      describing("Row 2", () => {
        throw "just a string";
      }),
    ).toThrow("Row 2: just a string");
  });
});

describe("readFullDate", () => {
  it("answers the full date a caller's model claims", () => {
    expect(readFullDate("2024-05-01", "Row 2")).toBe(YearMonthDay.get(2024, 5, 1));
  });

  it("rejects a bare year, which parses cleanly and is the wrong kind", () => {
    // `PlainDate.from` answers a `Year` for a four-character cell, so nothing downstream fails
    // where the row is still known — the value reaches a day scale and is dropped or drawn at NaN.
    expect(() => readFullDate("1979", 'Row 2, "Alien", Watch Date')).toThrow(
      'Row 2, "Alien", Watch Date: "1979" is a bare year, not a full date',
    );
  });

  it("names the row for an unparseable cell too, rather than only for the wrong kind", () => {
    expect(() => readFullDate("", 'Row 2, "Alien", Watch Date')).toThrow(
      'Row 2, "Alien", Watch Date: Unkown Date Format',
    );
  });
});

describe("sheetError", () => {
  it("throws with the context and the detail joined", () => {
    expect(() => sheetError('Show "Lost"', "has no seasons")).toThrow('Show "Lost": has no seasons');
  });

  it("never returns, so it can stand in an expression position", () => {
    // Used as `?? sheetError(...)` where a value is required.
    const value: number = Math.random() < 2 ? 1 : sheetError("x", "y");

    expect(value).toBe(1);
  });
});
