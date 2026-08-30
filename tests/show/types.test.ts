import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import { groupToColour, isShow, typeToName, type Season, type Show } from "../../src/show/types";
import { ageRatingToColour } from "../../src/utils/types";
import { show } from "../fixtures/shows";

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

  it("paints a rating with the same map the games tab uses", () => {
    // An age rating is the one field all three tabs record, so a swatch has to mean the same
    // thing on each — these sheets write BBFC bare numbers where games write PEGI.
    expect(groupToColour("rating", show({ rating: "15" }))).toBe(ageRatingToColour("15"));
    expect(groupToColour("rating", show({ rating: "18" }))).toBe(ageRatingToColour("18"));
  });

  it("falls back to an empty string for every other grouping", () => {
    // Genre, network and franchise carry no colour vocabulary on this tab; "" hands the choice
    // to Highcharts rather than inventing one.
    expect(groupToColour("name", show())).toBe("");
    expect(groupToColour("type", show())).toBe("");
    expect(groupToColour("genre", show())).toBe("");
    expect(groupToColour("network", show())).toBe("");
    expect(groupToColour("franchise", show())).toBe("");
    expect(groupToColour("none", show())).toBe("");
  });
});

describe("typeToName", () => {
  it("title-cases the sheet's lower-case values", () => {
    // The sheet holds "show"/"anime"; a wedge or a legend entry should not.
    expect(typeToName("show")).toBe("Show");
    expect(typeToName("anime")).toBe("Anime");
  });
});
