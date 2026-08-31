import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { seasonSpans, spanKey } from "../../src/show/cardData";
import { season, show } from "../fixtures/shows";

describe("spanKey", () => {
  it("keys a season by its show as well as its number, so two shows' first seasons do not collide", () => {
    // A franchise strip draws several shows' seasons side by side and every one of them has an
    // S1, so the season number alone is not a unique key.
    const andor = show({ name: "Andor" });
    const rogueOne = show({ name: "Rogue One" });

    expect(spanKey(season(andor))).not.toBe(spanKey(season(rogueOne)));
  });
});

describe("seasonSpans", () => {
  it("returns one span per season across every show given", () => {
    const andor = show({ name: "Andor" });
    andor.s = [season(andor), season(andor)];
    const rogueOne = show({ name: "Rogue One" });
    rogueOne.s = [season(rogueOne)];

    expect(seasonSpans([andor, rogueOne], YearMonthDay.get(2025, 1, 1))).toHaveLength(3);
  });

  it("runs a season with no end date to today, the same as an open bar on the full timeline", () => {
    const parent = show();
    parent.s = [season(parent)];
    const today = YearMonthDay.get(2025, 6, 1);

    expect(seasonSpans([parent], today)[0].end).toBe(today);
  });

  it("carries the season itself alongside the span, for the tooltip to read", () => {
    const parent = show();
    const s = season(parent, { endDate: YearMonthDay.get(2022, 4, 8) });
    parent.s = [s];

    expect(seasonSpans([parent], YearMonthDay.get(2025, 1, 1))[0].season).toBe(s);
  });
});
