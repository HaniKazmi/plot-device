import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { heroKicker } from "../../src/common/heroKicker";

describe("heroKicker", () => {
  it("states something in hand by what is being done and the day it began", () => {
    expect(heroKicker({ doing: "Playing", since: YearMonthDay.get(2026, 10, 23) })).toBe("Playing since 23 Oct 2026");
    expect(heroKicker({ doing: "Reading", since: YearMonthDay.get(2026, 10, 29) })).toBe("Reading since 29 Oct 2026");
  });

  it("states something done by what was done and the day it ended, in the same construction", () => {
    expect(heroKicker({ did: "Watched", on: YearMonthDay.get(2026, 10, 17) })).toBe("Watched 17 Oct 2026");
    expect(heroKicker({ did: "Finished", on: YearMonthDay.get(2026, 11, 4) })).toBe("Finished 4 Nov 2026");
  });
});
