import { describe, expect, it } from "vitest";
import { YearMonthDay, type YearNumber } from "../../src/common/date";
import { watchRibbonYears } from "../../src/movie/watchTimelineData";
import { movie } from "../fixtures/movies";

describe("watchRibbonYears", () => {
  it("has one row per distinct watch year, ascending", () => {
    const data = [
      movie({ startDate: YearMonthDay.get(2021, 3, 1) }),
      movie({ startDate: YearMonthDay.get(2019, 3, 1) }),
      movie({ startDate: YearMonthDay.get(2020, 3, 1) }),
    ];

    expect(watchRibbonYears(data).map((row) => row.year)).toEqual([2019, 2020, 2021]);
  });

  it("leaves a year with nothing watched absent rather than as an empty row", () => {
    const data = [
      movie({ startDate: YearMonthDay.get(2019, 3, 1) }),
      movie({ startDate: YearMonthDay.get(2021, 3, 1) }),
    ];

    expect(watchRibbonYears(data).map((row) => row.year)).not.toContain(2020 as YearNumber);
  });

  it("slides two films watched the same day clear of each other, both staying in one lane", () => {
    const day = YearMonthDay.get(2020, 6, 15);
    const data = [movie({ name: "First", startDate: day }), movie({ name: "Second", startDate: day })];

    const row = watchRibbonYears(data)[0];

    expect(row.laneCount).toBe(1);
    expect(row.bands).toHaveLength(2);
    expect(row.bands[0].startPercent).not.toBe(row.bands[1].startPercent);
    // Tiled clear rather than overlapping — the second starts no earlier than where the first ends.
    expect(row.bands[1].startPercent).toBeGreaterThanOrEqual(row.bands[0].startPercent + row.bands[0].widthPercent);
  });

  it("carries the movie on the band, for the tooltip", () => {
    const film = movie({ name: "Arrival", startDate: YearMonthDay.get(2020, 6, 15) });

    expect(watchRibbonYears([film])[0].bands[0].movie).toBe(film);
  });

  it("keeps a film watched on 31 December from overhanging the strip", () => {
    const film = movie({ startDate: YearMonthDay.get(2020, 12, 31) });

    const band = watchRibbonYears([film])[0].bands[0];

    expect(band.startPercent + band.widthPercent).toBeLessThanOrEqual(100);
  });
});
