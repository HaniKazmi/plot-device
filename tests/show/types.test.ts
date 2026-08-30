import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { groupToColour, isShow, type Season, type Show } from "../../src/show/types";

const show = (): Show => ({
  name: "Severance",
  status: "Watching",
  startDate: YearMonthDay.get(2022, 2, 18),
  anime: false,
  s: [],
  e: 9,
  minutes: 400,
});

const season = (parent: Show): Season => ({
  s: 1,
  e: 9,
  startDate: YearMonthDay.get(2022, 2, 18),
  episodeLength: 45,
  minutes: 405,
  show: parent,
});

describe("isShow", () => {
  it("discriminates on `name`, the one field a season never carries", () => {
    const parent = show();

    expect(isShow(parent)).toBe(true);
    expect(isShow(season(parent))).toBe(false);
  });

  it("narrows the type so callers can reach fields of either side", () => {
    // Timeline and the card components take Show | Season and branch on this.
    const parent = show();
    const describe = (arg: Show | Season) => (isShow(arg) ? arg.name : arg.s);

    expect(describe(parent)).toBe("Severance");
    expect(describe(season(parent))).toBe(1);
  });
});

describe("groupToColour", () => {
  it("colours by status, the only grouping shows have a palette for", () => {
    expect(groupToColour("status", show())).toBe("#00a5a6");
    expect(groupToColour("status", { ...show(), status: "Ended" })).toBe("#338c5f");
  });

  it("falls back to an empty string for every other grouping", () => {
    // Shows have no genre or franchise colouring the way games do; "" hands the choice to
    // Highcharts rather than inventing one.
    expect(groupToColour("name", show())).toBe("");
    expect(groupToColour("anime", show())).toBe("");
    expect(groupToColour("none", show())).toBe("");
  });
});
