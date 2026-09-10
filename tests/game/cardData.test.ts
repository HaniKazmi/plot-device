import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { gameKey, gameSpan, spanKey } from "../../src/game/cardData";
import { videoGame } from "../fixtures/gameRows";

// A fixed "today" rather than the real clock, so an open-ended game's span stays checkable.
const TODAY = YearMonthDay.get(2024, 6, 1);

describe("gameSpan", () => {
  it("uses the game's own dates when the sheet gives full ones, and calls them precise", () => {
    const span = gameSpan(
      videoGame({ startDate: YearMonthDay.get(2020, 1, 15), endDate: YearMonthDay.get(2020, 2, 3) }),
      TODAY,
    );

    expect(span).toEqual({ start: YearMonthDay.get(2020, 1, 15), end: YearMonthDay.get(2020, 2, 3), precise: true });
  });

  it("spans the whole year of a bare-year date, marked imprecise, rather than inventing a day", () => {
    // Half the library carries a bare year; a strip dissolves such a span under a mask, and the
    // packed timeline leaves it out, so the honest span at any scale is the year itself.
    const span = gameSpan(videoGame({ startDate: Year.get(2007), endDate: Year.get(2007) }), TODAY);

    expect(span.start).toBe(YearMonthDay.get(2007, 1, 1));
    expect(span.end).toBe(YearMonthDay.get(2007, 12, 31));
    expect(span.precise).toBe(false);
  });

  it("is imprecise where either end is a bare year", () => {
    const span = gameSpan(videoGame({ startDate: YearMonthDay.get(2020, 1, 15), endDate: Year.get(2020) }), TODAY);

    expect(span.precise).toBe(false);
  });

  it("runs an unfinished game to today, whatever its start's precision", () => {
    expect(gameSpan(videoGame({ endDate: undefined }), TODAY).end).toBe(TODAY);
    expect(gameSpan(videoGame({ startDate: Year.get(2023), endDate: undefined }), TODAY).end).toBe(TODAY);
  });
});

describe("spanKey", () => {
  it("tells a replay apart from the first playthrough, which name and platform alone do not", () => {
    const first = videoGame({ startDate: YearMonthDay.get(2019, 1, 1) });
    const replay = videoGame({ startDate: YearMonthDay.get(2023, 1, 1) });

    expect(spanKey(first)).not.toBe(spanKey(replay));
    expect(gameKey(first)).toBe(`game-${spanKey(first)}`);
  });
});
