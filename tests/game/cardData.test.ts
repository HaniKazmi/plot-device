import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { gameKey, gameRows, spanKey } from "../../src/game/cardData";
import { videoGame } from "../fixtures/gameRows";

describe("spanKey", () => {
  it("tells a replay apart from the first playthrough, which name and platform alone do not", () => {
    const first = videoGame({ startDate: YearMonthDay.get(2019, 1, 1) });
    const replay = videoGame({ startDate: YearMonthDay.get(2023, 1, 1) });

    expect(spanKey(first)).not.toBe(spanKey(replay));
    expect(gameKey(first)).toBe(`game-${spanKey(first)}`);
  });
});

describe("gameRows", () => {
  it("states the series just above the franchise, and leaves a standalone without the row", () => {
    const rows = gameRows(
      videoGame({ series: "Final Fantasy", seriesNumber: 7.1, franchise: "Final Fantasy" }),
      "light",
    );
    const labels = rows.map((row) => row.label);

    expect(rows.find((row) => row.label === "Series")?.value).toBe("#7.1 · Final Fantasy");
    expect(labels.indexOf("Series") + 1).toBe(labels.indexOf("Franchise"));
    expect(gameRows(videoGame({ series: "" }), "light").map((row) => row.label)).not.toContain("Series");
  });
});
