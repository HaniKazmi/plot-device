import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { spanUntil } from "../../src/common/medium";

// A fixed "today" rather than the real clock, so an open entry's span stays checkable.
const TODAY = YearMonthDay.get(2024, 6, 1);

describe("spanUntil", () => {
  it("is the entry's own dates", () => {
    const span = spanUntil({ startDate: YearMonthDay.get(2020, 1, 15), endDate: YearMonthDay.get(2020, 2, 3) }, TODAY);

    expect(span).toEqual({ start: YearMonthDay.get(2020, 1, 15), end: YearMonthDay.get(2020, 2, 3) });
  });

  it("runs an open entry to today", () => {
    expect(spanUntil({ startDate: YearMonthDay.get(2023, 1, 1) }, TODAY).end).toBe(TODAY);
  });
});
