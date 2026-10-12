import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import type { OmniItem } from "../../src/common/medium";
import { toOmniItems } from "../../src/app/library";
import { franchiseRings, hasBreakdown, ringValue } from "../../src/omnibus/franchiseSunburstData";
import { book } from "../fixtures/books";
import { videoGame } from "../fixtures/gameRows";
import { library } from "../fixtures/library";

const day = (year: number, month: number, date: number) => YearMonthDay.get(year, month, date);

const game = (name: string, series: string): OmniItem => ({
  ...toOmniItems(library({ game: [videoGame({ name, startDate: day(2020, 1, 1), endDate: day(2020, 2, 1) })] }))[0],
  series,
});

const novel = (name: string): OmniItem =>
  toOmniItems(library({ book: [book({ name, startDate: day(2021, 1, 1), endDate: day(2021, 2, 1) })] }))[0];

describe("franchiseRings", () => {
  it("opens a franchise met in two media on the medium, then the series inside it", () => {
    expect(franchiseRings([game("Witcher 3", "The Witcher"), novel("The Last Wish")])).toEqual(["medium", "series"]);
  });

  it("opens a franchise met in one medium on its series, a ring of one medium being a full circle", () => {
    expect(franchiseRings([game("Witcher 2", "The Witcher"), game("Gwent", "")])).toEqual(["series"]);
  });
});

describe("hasBreakdown", () => {
  it("draws a wheel for two series in one medium", () => {
    expect(hasBreakdown([game("Witcher 3", "The Witcher"), game("Gwent", "")])).toBe(true);
  });

  it("draws a wheel for two media", () => {
    expect(hasBreakdown([game("Witcher 3", "The Witcher"), novel("The Last Wish")])).toBe(true);
  });

  it("draws none for one series in one medium, which would be one full ring around its entries", () => {
    expect(hasBreakdown([game("Witcher 2", "The Witcher"), game("Witcher 3", "The Witcher")])).toBe(false);
  });
});

describe("ringValue", () => {
  it("reads a standalone work as a series of itself, as every tab's own wheel does", () => {
    expect(ringValue(game("Gwent", ""), "series")).toBe("Gwent");
  });

  it("names a book's missing style rather than drawing a nameless wedge", () => {
    expect(ringValue(novel("The Last Wish"), "style")).toBe("No style");
  });

  it("reads the medium by the word its shelf and colour are found by", () => {
    expect(ringValue(novel("The Last Wish"), "medium")).toBe("Books");
  });
});
