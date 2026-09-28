import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { gameKey, spanKey } from "../../src/game/cardData";
import { videoGame } from "../fixtures/gameRows";

describe("spanKey", () => {
  it("tells a replay apart from the first playthrough, which name and platform alone do not", () => {
    const first = videoGame({ startDate: YearMonthDay.get(2019, 1, 1) });
    const replay = videoGame({ startDate: YearMonthDay.get(2023, 1, 1) });

    expect(spanKey(first)).not.toBe(spanKey(replay));
    expect(gameKey(first)).toBe(`game-${spanKey(first)}`);
  });
});
