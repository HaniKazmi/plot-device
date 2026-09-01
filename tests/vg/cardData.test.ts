import { describe, expect, it } from "vitest";
import { Year, YearMonthDay } from "../../src/common/date";
import { franchiseIndex, gameSpans } from "../../src/vg/cardData";
import { videoGame } from "../fixtures/vgRows";

// A fixed "today" rather than the real clock, so an open-ended game's span stays checkable.
const TODAY = YearMonthDay.get(2024, 6, 1);

describe("gameSpans", () => {
  it("uses the game's own dates when the sheet gives full ones", () => {
    const [span] = gameSpans(
      [videoGame({ startDate: YearMonthDay.get(2020, 1, 1), endDate: YearMonthDay.get(2020, 3, 1) })],
      TODAY,
    );

    expect(span.start).toBe(YearMonthDay.get(2020, 1, 1));
    expect(span.end).toBe(YearMonthDay.get(2020, 3, 1));
  });

  it("marks a span built from a bare year as an estimate", () => {
    const [precise] = gameSpans([videoGame({ startDate: YearMonthDay.get(2020, 1, 1) })], TODAY);
    const [estimated] = gameSpans([videoGame({ startDate: Year.get(2007), endDate: Year.get(2007) })], TODAY);

    expect(precise.precise).toBe(true);
    expect(estimated.precise).toBe(false);
  });

  it("runs a year-only end to the end of its year rather than inventing a duration", () => {
    const [span] = gameSpans([videoGame({ startDate: YearMonthDay.get(2020, 1, 15), endDate: Year.get(2020) })], TODAY);

    expect(span.end).toBe(YearMonthDay.get(2020, 12, 31));
  });

  it("runs a game with no end date up to today, because it is still being played", () => {
    const [span] = gameSpans([videoGame({ endDate: undefined })], TODAY);

    expect(span.end).toBe(TODAY);
  });

  it("keys on platform as well as name, so the same game on two consoles stays two spans", () => {
    const spans = gameSpans(
      [videoGame({ platform: "Nintendo Switch" }), videoGame({ platform: "Nintendo Switch 2" })],
      TODAY,
    );

    expect(new Set(spans.map((span) => span.key)).size).toBe(2);
  });

  it("keys on start date too, so a replay does not collide with the first playthrough", () => {
    const spans = gameSpans(
      [videoGame({ startDate: YearMonthDay.get(2017, 3, 3) }), videoGame({ startDate: YearMonthDay.get(2022, 3, 3) })],
      TODAY,
    );

    expect(new Set(spans.map((span) => span.key)).size).toBe(2);
  });
});

describe("gameSpans for undated years", () => {
  // What the sheet holds for half the collection is a year and nothing more. These spans are
  // estimates within that year, and the properties below are what keeps them honest.
  const undated = (name: string, year: number, release: [number, number, number]) =>
    videoGame({ name, startDate: Year.get(year), endDate: Year.get(year), releaseDate: YearMonthDay.get(...release) });

  it("gives a lone game its whole year", () => {
    const [span] = gameSpans([undated("only", 2008, [2005, 1, 1])], TODAY);

    expect(span.start).toBe(YearMonthDay.get(2008, 1, 1));
    expect(span.end).toBe(YearMonthDay.get(2008, 12, 31));
  });

  it("opens the whole year to a game whose release is a bare year too", () => {
    // Half the collection carries a year and nothing more, and the release column is no different,
    // so a game both released and played in 2007 records two bare years. How far into the year the
    // release fell is unanswerable from that, which is exactly what the whole year says.
    const [span] = gameSpans(
      [videoGame({ name: "old", startDate: Year.get(2007), endDate: Year.get(2007), releaseDate: Year.get(2007) })],
      TODAY,
    );

    expect(span.start).toBe(YearMonthDay.get(2007, 1, 1));
    expect(span.end).toBe(YearMonthDay.get(2007, 12, 31));
  });

  it("shares a year out between the games naming it, without overlapping", () => {
    const spans = gameSpans(
      [undated("a", 2008, [2001, 1, 1]), undated("b", 2008, [2002, 1, 1]), undated("c", 2008, [2003, 1, 1])],
      TODAY,
    );

    expect(spans[0].start).toBe(YearMonthDay.get(2008, 1, 1));
    expect(spans.at(-1)!.end).toBe(YearMonthDay.get(2008, 12, 31));
    spans.slice(1).forEach((span, index) => expect(spans[index].end < span.start).toBe(true));
  });

  it("orders them by release date, whatever order the sheet lists them in", () => {
    const spans = gameSpans(
      [
        undated("late", 2008, [2007, 6, 1]),
        undated("early", 2008, [2001, 6, 1]),
        undated("middle", 2008, [2004, 6, 1]),
      ],
      TODAY,
    );

    const byPosition = spans.toSorted((a, b) => (a.start < b.start ? -1 : 1)).map((span) => span.game.name);
    expect(byPosition).toEqual(["early", "middle", "late"]);
  });

  it("never starts a game before it was released", () => {
    // The one hard fact available here: a game cannot have been played before it existed.
    const spans = gameSpans([undated("old", 2008, [2001, 1, 1]), undated("autumn", 2008, [2008, 10, 1])], TODAY);

    const autumn = spans.find((span) => span.game.name === "autumn")!;
    expect(autumn.start >= YearMonthDay.get(2008, 10, 1)).toBe(true);
  });

  it("keeps a release from an earlier year off the floor, so the span can open in January", () => {
    const [span] = gameSpans([undated("backlog", 2008, [1999, 3, 1])], TODAY);

    expect(span.start).toBe(YearMonthDay.get(2008, 1, 1));
  });

  it("survives a release date later than the year the sheet says it was played", () => {
    // A contradiction in the sheet. The strip should still draw something rather than throw.
    const [span] = gameSpans([undated("impossible", 2008, [2013, 8, 29])], TODAY);

    expect(span.start.year).toBe(2008);
    expect(span.start <= span.end).toBe(true);
  });

  it("keeps a game floored onto the last day of its year off the whole of that year", () => {
    // The share-out leaves the cursor one past the end of a year it fills exactly, so a second
    // game floored onto that last day asks for the day after it — a day the year does not have.
    // The estimate then has no start, and the fallback for a game with no estimate is 1 January,
    // which draws a December release across the entire year and over its neighbour.
    const spans = gameSpans([undated("first", 2008, [2008, 12, 31]), undated("second", 2008, [2008, 12, 31])], TODAY);

    spans.forEach((span) => {
      expect(span.start >= YearMonthDay.get(2008, 12, 1)).toBe(true);
      expect(span.start <= span.end).toBe(true);
    });
  });

  it("estimates each year independently", () => {
    const spans = gameSpans([undated("a", 2008, [2001, 1, 1]), undated("b", 2010, [2002, 1, 1])], TODAY);

    expect(spans[0].start).toBe(YearMonthDay.get(2008, 1, 1));
    expect(spans[1].start).toBe(YearMonthDay.get(2010, 1, 1));
  });
});

describe("franchiseIndex", () => {
  it("groups games under their franchise", () => {
    const botw = videoGame({ name: "Breath of the Wild", franchise: "Zelda" });
    const totk = videoGame({ name: "Tears of the Kingdom", franchise: "Zelda" });
    const mario = videoGame({ name: "Odyssey", franchise: "Mario" });

    const index = franchiseIndex([botw, totk, mario]);

    expect(index.get("Zelda")).toEqual([botw, totk]);
    expect(index.get("Mario")).toEqual([mario]);
  });

  it("skips games with no franchise, which are not a series to be shown together", () => {
    const index = franchiseIndex([videoGame({ franchise: "" }), videoGame({ franchise: "" })]);

    expect(index.size).toBe(0);
  });
});
