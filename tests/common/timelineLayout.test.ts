import { describe, expect, it } from "vitest";
import { YearMonth, YearMonthDay } from "../../src/common/date";
import {
  assignRows,
  buildTicks,
  decidePlacement,
  packRows,
  percentAtScroll,
  scrollAtPercent,
  yearAtPercent,
  yearMarkers,
  type TimelineData,
} from "../../src/common/timelineLayout";
import type { Colour } from "../../src/utils/types";

const item = (name: string, start: [number, number, number], end: [number, number, number]): TimelineData => ({
  name,
  tooltip: () => null,
  colour: "#ff0000" as Colour,
  start: YearMonthDay.get(...start),
  end: YearMonthDay.get(...end),
});

const interval = (start: [number, number, number], end: [number, number, number]) => ({
  start: YearMonthDay.get(...start),
  end: YearMonthDay.get(...end),
});

describe("assignRows", () => {
  // The rule both the full timeline and the card strip pack by, which is why it lives here.
  it("keeps items that do not overlap on one row", () => {
    expect(assignRows([interval([2024, 1, 1], [2024, 2, 1]), interval([2024, 3, 1], [2024, 4, 1])])).toEqual([0, 0]);
  });

  it("opens a row for an item that overlaps the one before it", () => {
    expect(assignRows([interval([2024, 1, 1], [2024, 6, 1]), interval([2024, 3, 1], [2024, 4, 1])])).toEqual([0, 1]);
  });

  it("keeps an item that starts the day another ends on the same row", () => {
    // A handoff, not concurrent activity: separating these would say both were going at once.
    expect(assignRows([interval([2024, 1, 1], [2024, 3, 1]), interval([2024, 3, 1], [2024, 4, 1])])).toEqual([0, 0]);
  });

  it("reuses a row that has freed up rather than always opening a new one", () => {
    expect(
      assignRows([
        interval([2024, 1, 1], [2024, 12, 1]),
        interval([2024, 2, 1], [2024, 3, 1]),
        interval([2024, 4, 1], [2024, 5, 1]),
      ]),
    ).toEqual([0, 1, 1]);
  });

  it("returns nothing for nothing", () => {
    expect(assignRows([])).toEqual([]);
  });
});

describe("packRows", () => {
  it("keeps non-overlapping items on one row, so the chart stays shallow", () => {
    const [rows, maxRow] = packRows([item("a", [2024, 1, 1], [2024, 2, 1]), item("b", [2024, 3, 1], [2024, 4, 1])]);

    expect(rows.map((r) => r.rowNumber)).toEqual([0, 0]);
    expect(maxRow).toBe(0);
  });

  it("opens a new row for an item that overlaps the one before it", () => {
    const [rows, maxRow] = packRows([item("a", [2024, 1, 1], [2024, 6, 1]), item("b", [2024, 3, 1], [2024, 4, 1])]);

    expect(rows.map((r) => r.rowNumber)).toEqual([0, 1]);
    expect(maxRow).toBe(1);
  });

  it("reuses the first row that has freed up rather than always opening a new one", () => {
    const [rows] = packRows([
      item("long", [2024, 1, 1], [2024, 12, 1]),
      item("short", [2024, 2, 1], [2024, 3, 1]),
      item("later", [2024, 4, 1], [2024, 5, 1]),
    ]);

    // "later" starts after "short" ends, so it packs back into row 1 instead of opening row 2.
    expect(rows.map((r) => [r.name, r.rowNumber])).toEqual([
      ["long", 0],
      ["short", 1],
      ["later", 1],
    ]);
  });

  it("lets an item start exactly where the previous one ended", () => {
    const [, maxRow] = packRows([item("a", [2024, 1, 1], [2024, 2, 1]), item("b", [2024, 2, 1], [2024, 3, 1])]);

    expect(maxRow).toBe(0);
  });

  it("sorts by start date, so input order does not change the packing", () => {
    const [rows] = packRows([item("late", [2024, 6, 1], [2024, 7, 1]), item("early", [2024, 1, 1], [2024, 2, 1])]);

    expect(rows.map((r) => r.name)).toEqual(["early", "late"]);
  });

  it("links each item to its row neighbours, which is what tells the labels where the gaps are", () => {
    const [rows] = packRows([item("a", [2024, 1, 1], [2024, 2, 1]), item("b", [2024, 3, 1], [2024, 4, 1])]);
    const [a, b] = rows;

    expect(a.previousDate).toBeUndefined();
    expect(a.nextDate).toBe(b.start);
    expect(b.previousDate).toBe(a.end);
    expect(b.nextDate).toBeUndefined();
  });

  it("links only within a row, not across rows", () => {
    const [rows] = packRows([item("a", [2024, 1, 1], [2024, 6, 1]), item("b", [2024, 3, 1], [2024, 4, 1])]);

    expect(rows[0].nextDate).toBeUndefined();
    expect(rows[1].previousDate).toBeUndefined();
  });

  it("copies each item rather than annotating the caller's objects", () => {
    const input = [item("a", [2024, 1, 1], [2024, 2, 1])];
    const [rows] = packRows(input);

    expect(rows[0]).not.toBe(input[0]);
    expect(input[0]).not.toHaveProperty("rowNumber");
  });

  it("returns no rows for empty data", () => {
    expect(packRows([])[0]).toEqual([]);
  });
});

describe("decidePlacement", () => {
  const base = { textWidth: 100, rectWidth: 10, leftWidth: 0, rightWidth: 0, rightUsed: false };

  it("centres a label that fits inside its bar", () => {
    expect(decidePlacement({ ...base, textWidth: 10, rectWidth: 50 })).toEqual({
      placement: "center",
      rightUsed: false,
    });
  });

  it("centres a label exactly as wide as its bar", () => {
    expect(decidePlacement({ ...base, textWidth: 50, rectWidth: 50 }).placement).toBe("center");
  });

  it("spills left when the label overflows the bar and the left gap can hold it", () => {
    expect(decidePlacement({ ...base, leftWidth: 200 })).toEqual({ placement: "left", rightUsed: false });
  });

  it("prefers left over right, so labels do not drift away from their bars", () => {
    expect(decidePlacement({ ...base, leftWidth: 200, rightWidth: 200 }).placement).toBe("left");
  });

  it("spills right when an earlier item in the row already claimed the left gap", () => {
    // The gap to this item's left is the same gap as the previous item's right.
    expect(decidePlacement({ ...base, leftWidth: 200, rightWidth: 200, rightUsed: true })).toEqual({
      placement: "right",
      rightUsed: true,
    });
  });

  it("spills right when the left gap is too small", () => {
    expect(decidePlacement({ ...base, leftWidth: 10, rightWidth: 200 }).placement).toBe("right");
  });

  it("spans the bar and the gap together when neither holds the label alone", () => {
    // 60px of text over a 40px bar with a 30px gap: too wide for either, whole across both.
    expect(decidePlacement({ ...base, textWidth: 60, rectWidth: 40, leftWidth: 10, rightWidth: 30 })).toEqual({
      placement: "span",
      rightUsed: true,
    });
  });

  it("leaves the gap to the neighbour when spanning would still not fit the label", () => {
    // Claiming a gap and clipping anyway spends it for nothing; the next event may fit there whole.
    expect(decidePlacement({ ...base, textWidth: 200, rectWidth: 40, leftWidth: 10, rightWidth: 30 })).toEqual({
      placement: "center",
      rightUsed: false,
    });
  });

  it("does not span into a gap an earlier event has already claimed", () => {
    expect(
      decidePlacement({ ...base, textWidth: 60, rectWidth: 40, leftWidth: 10, rightWidth: 30, rightUsed: true })
        .placement,
    ).toBe("center");
  });

  it("centres and overflows when neither gap can hold the label", () => {
    // Better a label that spills over its neighbours than one that vanishes.
    expect(decidePlacement({ ...base, leftWidth: 10, rightWidth: 10 })).toEqual({
      placement: "center",
      rightUsed: false,
    });
  });

  it("leaves a claimed right gap claimed when nothing fits", () => {
    expect(decidePlacement({ ...base, leftWidth: 10, rightWidth: 10, rightUsed: true }).rightUsed).toBe(true);
  });

  it("releases the right gap whenever the label lands inside its own bar", () => {
    expect(decidePlacement({ ...base, textWidth: 10, rectWidth: 50, rightUsed: true }).rightUsed).toBe(false);
  });
});

describe("buildTicks", () => {
  const totalDays = YearMonthDay.get(2024, 1, 1).daysTo(YearMonthDay.get(2025, 1, 1))!;
  const ticks = buildTicks(YearMonth.get(2024, 1), YearMonth.get(2025, 1), totalDays);

  it("measures from the first month, and reaches exactly the full width at the last", () => {
    // `daysTo` counts the days a range spans rather than the difference between its ends, so a
    // date measured against itself is 1 and the opening tick sits a single day in, not at zero.
    // The axis and the gridlines share this one array, so both inherit that offset together and
    // cannot drift apart — which is the property worth holding, rather than the offset itself.
    expect(ticks[0].percent).toBeCloseTo((1 / totalDays) * 100);
    expect(ticks.at(-1)!.percent).toBe(100);
  });

  it("rises monotonically, so a later month never renders left of an earlier one", () => {
    expect(ticks.every((tick, i) => i === 0 || tick.percent > ticks[i - 1].percent)).toBe(true);
  });

  it("ranks January above the other quarter months, and those above the rest", () => {
    expect(ticks.map((tick) => tick.level).slice(0, 5)).toEqual(["year", "month", "month", "quarter", "month"]);
  });

  it("walks every month inclusive of both ends", () => {
    expect(ticks).toHaveLength(13);
    expect(ticks.at(-1)).toMatchObject({ level: "year", yearLabel: "2025" });
  });

  it("carries the month and year labels the axis renders", () => {
    expect(ticks[0]).toMatchObject({ monthLabel: "Jan", yearLabel: "2024", year: 2024 });
  });
});

describe("yearMarkers", () => {
  const markersFrom = (start: [number, number], end: [number, number]) => {
    const totalDays = YearMonthDay.get(start[0], start[1], 1).daysTo(YearMonthDay.get(end[0], end[1], 1))!;
    return yearMarkers(buildTicks(YearMonth.get(...start), YearMonth.get(...end), totalDays));
  };

  it("pins the opening year to the left edge, so a chart starting mid-year still owns it", () => {
    const markers = markersFrom([2022, 6], [2024, 6]);
    expect(markers[0]).toEqual({ year: 2022, percent: 0 });
  });

  it("names each year once when the data itself starts in January", () => {
    // The January tick and the pinned opening are the same marker. Two of them would give the
    // shading a zero-width band and the nav two chips for one year.
    const markers = markersFrom([2022, 1], [2024, 6]);
    expect(markers.map((marker) => marker.year)).toEqual([2022, 2023, 2024]);
    expect(markers[0].percent).toBe(0);
  });

  it("puts every later year on its own January", () => {
    const markers = markersFrom([2022, 6], [2024, 6]);
    expect(markers.map((marker) => marker.year)).toEqual([2022, 2023, 2024]);
    expect(markers[1].percent).toBeGreaterThan(0);
    expect(markers[2].percent).toBeGreaterThan(markers[1].percent);
  });

  it("has nothing to mark on an empty tick list", () => {
    expect(yearMarkers([])).toEqual([]);
  });
});

describe("yearAtPercent", () => {
  const markers = [
    { year: 2022, percent: 0 },
    { year: 2023, percent: 25 },
    { year: 2024, percent: 60 },
  ];

  it("reads a position inside a year as that year rather than the next", () => {
    expect(yearAtPercent(markers, 40)).toBe(2023);
  });

  it("takes a year's own edge as that year, which is where a chip scrolls to", () => {
    expect(yearAtPercent(markers, 25)).toBe(2023);
  });

  it("holds the last year to the right-hand end", () => {
    expect(yearAtPercent(markers, 100)).toBe(2024);
  });

  it("has no answer before the first marker, which is only reachable with no data", () => {
    expect(yearAtPercent([], 0)).toBeUndefined();
  });
});

describe("the year nav's scroll mapping", () => {
  // Spread so the last marker is well past the three quarters of the grid a 400vw chart can
  // scroll to, which is the range the naive mapping cannot reach.
  const markers = [
    { year: 2020, percent: 0 },
    { year: 2022, percent: 40 },
    { year: 2024, percent: 80 },
    { year: 2026, percent: 95 },
  ];
  /** A four-viewport chart: three quarters of the grid width is all `scrollLeft` can reach. */
  const gridWidth = 4000;
  const maxScroll = gridWidth * 0.75;

  /**
   * The invariant the whole mapping exists to hold: the two directions are inverses, so a chip
   * lights itself. It has to hold for the first and last years as well as the ones between, and
   * for the tail past the three quarters of the grid `scrollLeft` can reach — reading a marker's
   * own percentage as a scroll fraction satisfies the middle and silently fails there.
   */
  const roundTrips = (against: number) =>
    markers.map((marker) =>
      yearAtPercent(markers, percentAtScroll(markers, scrollAtPercent(markers, marker.percent, against), against)),
    );

  it("lights the chip that was clicked, for every year including the unreachable tail", () => {
    expect(roundTrips(maxScroll)).toEqual([2020, 2022, 2024, 2026]);
  });

  it("holds however much less than the grid the reachable range is", () => {
    // A container a third of the grid wide, and one barely narrower than it: the mapping is over
    // whatever `scrollLeft` can reach, so neither ratio may change which chip answers.
    expect(roundTrips(gridWidth * 0.67)).toEqual([2020, 2022, 2024, 2026]);
    expect(roundTrips(gridWidth * 0.05)).toEqual([2020, 2022, 2024, 2026]);
  });

  it("still names the year when a smooth scroll settles a fraction short of its target", () => {
    const landed = scrollAtPercent(markers, 40, maxScroll) - 0.5;
    expect(yearAtPercent(markers, percentAtScroll(markers, landed, maxScroll))).toBe(2022);
  });

  it("opens on the latest year, because the chart opens at its right-hand end", () => {
    expect(yearAtPercent(markers, percentAtScroll(markers, maxScroll, maxScroll))).toBe(2026);
  });

  it("starts on the earliest year at the left edge", () => {
    expect(scrollAtPercent(markers, 0, maxScroll)).toBe(0);
    expect(yearAtPercent(markers, percentAtScroll(markers, 0, maxScroll))).toBe(2020);
  });

  it("moves the highlight through every year in turn as the chart is dragged", () => {
    const seen: number[] = [];
    for (let scroll = 0; scroll <= maxScroll; scroll += maxScroll / 200) {
      const year = yearAtPercent(markers, percentAtScroll(markers, scroll, maxScroll));
      if (year !== undefined && year !== seen.at(-1)) seen.push(year);
    }
    expect(seen).toEqual([2020, 2022, 2024, 2026]);
  });

  it("reads a chart that fits its container as being at its latest year", () => {
    expect(percentAtScroll(markers, 0, 0)).toBe(95);
    expect(scrollAtPercent(markers, 40, 0)).toBe(0);
  });

  it("has nothing to map with no data, rather than dividing by an empty span", () => {
    expect(percentAtScroll([], 0, maxScroll)).toBe(0);
    expect(scrollAtPercent([], 50, maxScroll)).toBe(0);
  });
});
