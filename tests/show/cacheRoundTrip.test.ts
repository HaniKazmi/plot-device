import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { dateReviver } from "../../src/common/useData";
import { dropSeasonParents, jsonConverter, reviveSeasonParents } from "../../src/show/converter";
import { seasonRow, showRow } from "../fixtures/showRows";

const rows = [
  showRow({ Show: "Severance" }),
  seasonRow({ Season: "1", Episode: "9", Start: "2022-02-18", End: "2022-04-08", Episodes: "45" }),
  seasonRow({ Season: "2", Episode: "10", Start: "2025-01-17", End: "", Episodes: "50" }),
  showRow({ Show: "Andor", Anime: "TRUE" }),
  seasonRow({ Season: "1", Episode: "12", Start: "2022-09-21", End: "2022-11-23", Episodes: "40" }),
];

/** Exactly what `useData` does across a reload: write with the replacer, read with the reviver. */
const roundTrip = (shows: ReturnType<typeof jsonConverter>) => {
  const parsed = JSON.parse(JSON.stringify(shows, dropSeasonParents), dateReviver) as ReturnType<typeof jsonConverter>;
  reviveSeasonParents(parsed);
  return parsed;
};

describe("the localStorage round trip", () => {
  it("restores the data unchanged, so a cached visit renders what a fresh fetch would", () => {
    const original = jsonConverter(rows);

    expect(roundTrip(original)).toEqual(original);
  });

  it("survives serialising a cyclic graph at all", () => {
    // Season.show points back at its parent, so stringify without the replacer recurses.
    const original = jsonConverter(rows);

    expect(() => JSON.stringify(original)).toThrow(TypeError);
    expect(() => JSON.stringify(original, dropSeasonParents)).not.toThrow();
  });

  it("re-attaches each season to its own parent rather than a copy", () => {
    const [severance, andor] = roundTrip(jsonConverter(rows));

    expect(severance.s.every((season) => season.show === severance)).toBe(true);
    expect(andor.s.every((season) => season.show === andor)).toBe(true);
  });

  it("revives dates as interned PlainDates, not strings", () => {
    // Charts compare and group by these; a surviving string would sort correctly by accident
    // and then fail the moment anything calls a date method.
    const [severance] = roundTrip(jsonConverter(rows));

    expect(severance.startDate).toBe(YearMonthDay.get(2022, 2, 18));
    expect(severance.s[0].endDate).toBe(YearMonthDay.get(2022, 4, 8));
  });

  it("keeps an absent end date absent instead of reviving a null", () => {
    // JSON.stringify omits undefined-valued keys, so the reviver never sees the field. A null
    // would reach PlainDate.from and throw during the render that reads the cache.
    const [severance] = roundTrip(jsonConverter(rows));

    expect(severance.endDate).toBeUndefined();
    expect(severance.s[1].endDate).toBeUndefined();
  });

  it("preserves the non-date scalars", () => {
    const [severance, andor] = roundTrip(jsonConverter(rows));

    expect(severance.e).toBe(19);
    expect(severance.minutes).toBe(9 * 45 + 10 * 50);
    expect(andor.anime).toBe(true);
    expect(severance.anime).toBe(false);
  });
});

describe("dateReviver", () => {
  it("converts any key containing Date, at any depth", () => {
    expect(dateReviver("startDate", "2022-02-18")).toBe(YearMonthDay.get(2022, 2, 18));
    expect(dateReviver("releaseDate", "2022-02-18")).toBe(YearMonthDay.get(2022, 2, 18));
  });

  it("matches on the substring, so any future non-date field named *Date is corrupted", () => {
    expect(() => dateReviver("lastUpdateDate", "2022-02-18T10:00:00Z")).toThrow("Unkown Date Format");
  });

  it("is case sensitive, so a lowercase date key passes through untouched", () => {
    expect(dateReviver("startdate", "2022-02-18")).toBe("2022-02-18");
  });

  it("leaves every other key alone", () => {
    expect(dateReviver("name", "Severance")).toBe("Severance");
    expect(dateReviver("e", 9)).toBe(9);
  });
});
