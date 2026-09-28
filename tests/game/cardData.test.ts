import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { gameKey, gameSpan, spanKey } from "../../src/game/cardData";
import { videoGame } from "../fixtures/gameRows";

// A fixed "today" rather than the real clock, so an open-ended game's span stays checkable.
const TODAY = YearMonthDay.get(2024, 6, 1);

describe("gameSpan", () => {
  it("is the game's own dates", () => {
    const span = gameSpan(
      videoGame({ startDate: YearMonthDay.get(2020, 1, 15), endDate: YearMonthDay.get(2020, 2, 3) }),
      TODAY,
    );

    expect(span).toEqual({ start: YearMonthDay.get(2020, 1, 15), end: YearMonthDay.get(2020, 2, 3) });
  });

  it("runs an unfinished game to today", () => {
    expect(gameSpan(videoGame({ endDate: undefined }), TODAY).end).toBe(TODAY);
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
