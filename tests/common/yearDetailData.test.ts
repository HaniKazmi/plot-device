import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { pictureLanes, yearLog, type LogEntry } from "../../src/common/yearDetailData";

describe("pictureLanes", () => {
  it("stands a picture beside the last where there is room, and below it where there is not", () => {
    const { lanes, laneCount } = pictureLanes(
      [
        { x0: 0, x1: 10, width: 50 },
        { x0: 20, x1: 30, width: 50 },
        { x0: 60, x1: 70, width: 50 },
      ],
      4,
    );

    expect(lanes).toEqual([0, 1, 0]);
    expect(laneCount).toBe(2);
  });

  it("holds a lane for as long as the line under a picture runs past it", () => {
    const { lanes } = pictureLanes(
      [
        { x0: 0, x1: 300, width: 50 },
        { x0: 100, x1: 110, width: 50 },
      ],
      4,
    );

    expect(lanes).toEqual([0, 1]);
  });

  it("answers one lane for nothing, so a height divided by it stays finite", () => {
    expect(pictureLanes([], 4).laneCount).toBe(1);
  });
});

const SIZES = { entry: 40, month: 24, quiet: 16, gap: 4 };
const FROM = YearMonthDay.get(2025, 1, 1);
const TO = YearMonthDay.get(2025, 3, 31);
const entry = (start: [number, number, number], end: [number, number, number], open = false): LogEntry => ({
  start: YearMonthDay.get(...start),
  end: YearMonthDay.get(...end),
  open,
});

describe("yearLog", () => {
  it("heads every month newest first, a quiet month shorter than a busy one", () => {
    const { rows } = yearLog([entry([2025, 2, 10], [2025, 2, 20])], FROM, TO, SIZES);
    const months = rows.filter((row) => row.kind === "month");

    expect(months.map((row) => [row.month, row.count, row.height])).toEqual([
      [3, 0, 16],
      [2, 1, 24],
      [1, 0, 16],
    ]);
  });

  it("puts each entry under the month it began in, the latest begun first", () => {
    const { rows } = yearLog([entry([2025, 2, 3], [2025, 2, 4]), entry([2025, 2, 20], [2025, 2, 21])], FROM, TO, SIZES);

    expect(rows.map((row) => (row.kind === "entry" ? `entry ${row.index}` : `month ${row.month}`))).toEqual([
      "month 3",
      "month 2",
      "entry 1",
      "entry 0",
      "month 1",
    ]);
  });

  it("runs a line still going up to the top, and one begun before the window up from the bottom", () => {
    const { lines, height, rows } = yearLog(
      [entry([2025, 2, 10], [2025, 3, 31], true), entry([2024, 11, 1], [2025, 1, 15])],
      FROM,
      TO,
      SIZES,
    );

    expect(lines[0].top).toBe(0);
    expect(lines[1].bottom).toBe(height);
    expect(rows.some((row) => row.kind === "entry" && row.index === 1)).toBe(false);
  });

  it("stands what ran at once side by side, and lets what followed share a lane", () => {
    const { lines, laneCount } = yearLog(
      [entry([2025, 1, 5], [2025, 3, 1]), entry([2025, 2, 1], [2025, 2, 10]), entry([2025, 3, 20], [2025, 3, 25])],
      FROM,
      TO,
      SIZES,
    );

    expect(lines[0].lane).not.toBe(lines[1].lane);
    expect(laneCount).toBe(2);
  });

  it("draws a point as a line of almost no length at its own row", () => {
    const { lines } = yearLog([entry([2025, 2, 10], [2025, 2, 10])], FROM, TO, SIZES);

    expect(lines[0].bottom - lines[0].top).toBeLessThan(2);
  });
});
