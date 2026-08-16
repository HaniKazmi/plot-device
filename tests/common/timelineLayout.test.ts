import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { decidePlacement, packRows, type TimelineData } from "../../src/common/timelineLayout";
import type { Colour } from "../../src/utils/types";

const item = (name: string, start: [number, number, number], end: [number, number, number]): TimelineData => ({
  name,
  tooltip: null,
  colour: "#ff0000" as Colour,
  start: YearMonthDay.get(...start),
  end: YearMonthDay.get(...end),
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
