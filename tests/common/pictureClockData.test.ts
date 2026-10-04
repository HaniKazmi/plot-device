import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { clockScale, foldLabel } from "../../src/common/pictureClockData";

const day = (year: number, month: number, date: number) => YearMonthDay.get(year, month, date);
const point = (year: number, month = 1, date = 1) => ({ start: day(year, month, date), end: day(year, month, date) });

describe("clockScale", () => {
  it("gives every touched year one width and folds each run of untouched years to a fixed width", () => {
    const scale = clockScale([point(2008), point(2009), point(2015)], 1000, 40);

    expect(scale.years.map((column) => column.year)).toEqual([2008, 2009, 2015]);
    expect(scale.folds).toEqual([{ from: 2010, to: 2014, x: 640, width: 40 }]);
    expect(scale.years.map((column) => column.width)).toEqual([320, 320, 320]);
    expect(scale.years[2].x).toBe(680);
  });

  it("keeps every year a span runs through, so a long span is never folded under", () => {
    const scale = clockScale([{ start: day(2014, 11, 27), end: day(2016, 11, 24) }], 300, 40);

    expect(scale.years.map((column) => column.year)).toEqual([2014, 2015, 2016]);
    expect(scale.folds).toEqual([]);
  });

  it("places a day by how far through its year it falls", () => {
    const scale = clockScale([point(2020), point(2021)], 200, 40);

    expect(scale.xAt(day(2020, 1, 1))).toBe(0);
    expect(scale.xAt(day(2021, 1, 1))).toBe(100);
    expect(scale.xAt(day(2021, 7, 2))).toBeCloseTo(100 + (182 / 365) * 100);
  });

  it("names a fold by the years it holds", () => {
    expect(foldLabel({ from: 2016, to: 2016 })).toBe("’16");
    expect(foldLabel({ from: 2011, to: 2014 })).toBe("’11–’14");
  });
});
