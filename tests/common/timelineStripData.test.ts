import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { buildStrip, stripYearTicks, type StripSpan } from "../../src/common/timelineStripData";

// Fixed endpoints rather than the real clock, so the arithmetic below is checkable by hand and
// stays true on New Year's Day.
const EPOCH = YearMonthDay.get(2020, 1, 1);
const TODAY = YearMonthDay.get(2024, 1, 1);

const span = (key: string, start: [number, number, number], end: [number, number, number]): StripSpan => ({
  key,
  start: YearMonthDay.get(...start),
  end: YearMonthDay.get(...end),
});

/** Most cases here are about where a band lands, not about how the strip divides itself. */
const bandsOf = <T extends StripSpan>(spans: T[], epoch: YearMonthDay, today: YearMonthDay) =>
  buildStrip(spans, epoch, today).bands;

describe("buildStrip", () => {
  it("places a span in proportion to its position in the scale", () => {
    const [band] = bandsOf([span("a", [2022, 1, 1], [2023, 1, 1])], EPOCH, TODAY);

    // Two of the four years in, one of them long.
    expect(band.startPercent).toBeCloseTo(50, 0);
    expect(band.widthPercent).toBeCloseTo(25, 0);
  });

  it("gives two overlapping spans their own offsets instead of chaining them", () => {
    const bands = bandsOf(
      [span("first", [2021, 1, 1], [2023, 1, 1]), span("second", [2022, 1, 1], [2022, 7, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.key)).toEqual(["first", "second"]);
    expect(bands[1].startPercent).toBeGreaterThan(bands[0].startPercent);
    expect(bands[1].startPercent).toBeLessThan(bands[0].startPercent + bands[0].widthPercent);
  });

  it("returns the caller's own fields alongside the position", () => {
    const [band] = bandsOf([{ ...span("a", [2022, 1, 1], [2023, 1, 1]), title: "Zelda" }], EPOCH, TODAY);

    expect(band.title).toBe("Zelda");
  });

  it("floors a single-day span so it stays visible", () => {
    const [band] = bandsOf([span("a", [2022, 1, 1], [2022, 1, 1])], EPOCH, TODAY);

    expect(band.widthPercent).toBe(0.5);
  });

  it("keeps the part of a span that reaches back before the epoch", () => {
    const [band] = bandsOf([span("a", [2018, 1, 1], [2021, 1, 1])], EPOCH, TODAY);

    expect(band.startPercent).toBe(0);
    expect(band.widthPercent).toBeCloseTo(25, 0);
  });

  it("drops a span that ends before the epoch, which cannot be measured against it", () => {
    // daysTo throws on a backwards comparison, so this is a crash rather than a stray band.
    expect(bandsOf([span("a", [2017, 1, 1], [2018, 1, 1])], EPOCH, TODAY)).toEqual([]);
  });

  it("drops a span that has not started yet", () => {
    expect(bandsOf([span("a", [2025, 1, 1], [2026, 1, 1])], EPOCH, TODAY)).toEqual([]);
  });

  it("keeps a span running past today inside the strip", () => {
    const [band] = bandsOf([span("a", [2023, 1, 1], [2030, 1, 1])], EPOCH, TODAY);

    expect(band.startPercent + band.widthPercent).toBeCloseTo(100, 5);
  });

  it("orders bands by start date, so paint order follows the scale", () => {
    const bands = bandsOf(
      [span("late", [2023, 1, 1], [2023, 2, 1]), span("early", [2021, 1, 1], [2021, 2, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.key)).toEqual(["early", "late"]);
  });
});

describe("buildStrip lanes", () => {
  it("keeps spans that do not overlap on one lane", () => {
    const { bands, laneCount } = buildStrip(
      [span("a", [2021, 1, 1], [2021, 6, 1]), span("b", [2022, 1, 1], [2022, 6, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.lane)).toEqual([0, 0]);
    expect(laneCount).toBe(1);
  });

  it("opens a lane for a span that overlaps the one before it", () => {
    const { bands, laneCount } = buildStrip(
      [span("long", [2021, 1, 1], [2023, 1, 1]), span("inside", [2022, 1, 1], [2022, 6, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.lane)).toEqual([0, 1]);
    expect(laneCount).toBe(2);
  });

  it("tiles spans recorded on one date rather than spending a lane on each", () => {
    // A sheet that records a single date for an entry is how identical spans arise, so this is
    // the common case rather than a pathological one. They never actually overlapped, and a lane
    // costs every band in the strip a share of its height.
    const same: [number, number, number] = [2022, 1, 1];
    const { bands, laneCount } = buildStrip(
      [span("a", same, same), span("b", same, same), span("c", same, same)],
      EPOCH,
      TODAY,
    );

    expect(laneCount).toBe(1);
    expect(bands.map((band) => band.startPercent)).toEqual([
      bands[0].startPercent,
      bands[0].startPercent + bands[0].widthPercent,
      bands[0].startPercent + bands[0].widthPercent * 2,
    ]);
  });

  it("tiles spans at the right edge apart rather than clamping them back into one stack", () => {
    // Tiling has nowhere left to put these, and the fallback that matters is which way it fails:
    // holding them inside the scale would return them to exactly the stack tiling exists to
    // break up, with all but the last unhoverable. Overhanging leaves each one's left edge on
    // the strip and lets the track clip the rest.
    const last: [number, number, number] = [2024, 1, 1];
    const { bands } = buildStrip([span("a", last, last), span("b", last, last), span("c", last, last)], EPOCH, TODAY);

    expect(new Set(bands.map((band) => band.startPercent)).size).toBe(3);
    expect(bands[1].startPercent).toBeGreaterThan(bands[0].startPercent);
    expect(bands[2].startPercent).toBeGreaterThan(bands[1].startPercent);
  });

  it("still opens a lane for a span buried inside another, which tiling cannot rescue", () => {
    const { bands, laneCount } = buildStrip(
      [span("long", [2021, 1, 1], [2023, 1, 1]), span("day", [2022, 1, 1], [2022, 1, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.lane)).toEqual([0, 1]);
    expect(laneCount).toBe(2);
  });

  it("reuses a lane once its last band has ended, rather than always opening a new one", () => {
    const { bands, laneCount } = buildStrip(
      [
        span("long", [2021, 1, 1], [2023, 1, 1]),
        span("inside", [2022, 1, 1], [2022, 3, 1]),
        span("later", [2022, 6, 1], [2022, 9, 1]),
      ],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.lane)).toEqual([0, 1, 1]);
    expect(laneCount).toBe(2);
  });

  it("keeps a span that starts the day another ends on the same lane", () => {
    // A handoff, not concurrent play: stacking these would say both were going at once.
    const { bands, laneCount } = buildStrip(
      [span("first", [2021, 1, 1], [2022, 1, 1]), span("second", [2022, 1, 1], [2022, 6, 1])],
      EPOCH,
      TODAY,
    );

    expect(bands.map((band) => band.lane)).toEqual([0, 0]);
    expect(laneCount).toBe(1);
  });

  it("leaves a span alone when the lane has already been drawn past it", () => {
    const { bands } = buildStrip(
      [span("early", [2021, 1, 1], [2021, 2, 1]), span("later", [2023, 1, 1], [2023, 2, 1])],
      EPOCH,
      TODAY,
    );

    // Wide enough apart to need no nudging: the second band keeps its true offset.
    expect(bands[1].startPercent).toBeCloseTo(75, 0);
  });

  it("packs against the clamped end, so a span running past today does not hold a lane open", () => {
    const { bands } = buildStrip(
      [span("open", [2021, 1, 1], [2030, 1, 1]), span("after", [2024, 1, 1], [2024, 1, 1])],
      EPOCH,
      TODAY,
    );

    // "open" is drawn only as far as today, and "after" starts there, so they abut rather than
    // overlap — the raw end date alone would have said otherwise.
    expect(bands.map((band) => band.lane)).toEqual([0, 0]);
  });

  it("reports one lane for an empty strip, so a caller can divide its height by the count", () => {
    expect(buildStrip([], EPOCH, TODAY).laneCount).toBe(1);
  });
});

describe("stripYearTicks", () => {
  it("marks every year boundary inside the scale", () => {
    // 2020 is the epoch itself, which is the strip's left edge rather than a boundary within it.
    expect(stripYearTicks(EPOCH, TODAY).map((tick) => tick.year)).toEqual([2021, 2022, 2023, 2024]);
  });

  it("opens at the first January after a mid-year epoch", () => {
    const [first] = stripYearTicks(YearMonthDay.get(2020, 6, 1), TODAY);

    expect(first.year).toBe(2021);
    expect(first.percent).toBeGreaterThan(0);
  });

  it("puts a year's line exactly where a band opening on that 1 January starts", () => {
    const [first] = stripYearTicks(EPOCH, TODAY);
    const [band] = bandsOf([span("a", [2021, 1, 1], [2021, 6, 1])], EPOCH, TODAY);

    // Both are the days elapsed before the same date, so a reader tracing a band back to the scale
    // lands on its own year line rather than a few pixels to the right of it.
    expect(band.startPercent).toBe(first.percent);
    // One of the scale's four years in, which is where that line belongs.
    expect(first.percent).toBeCloseTo(25, 0);
  });
});
