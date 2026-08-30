import { describe, expect, it } from "vitest";
import { YearMonthDay } from "../../src/common/date";
import {
  groupToColour,
  isShow,
  networkToColour,
  typeToColour,
  typeToName,
  type Season,
  type Show,
} from "../../src/show/types";
import { ageRatingToColour, genreToColour, NEUTRAL_FILL } from "../../src/utils/types";
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
  it("colours by status", () => {
    expect(groupToColour("status", show())).toBe("#00a5a6");
    expect(groupToColour("status", { ...show(), status: "Ended" })).toBe("#338c5f");
  });

  it("paints a rating with the same map the games tab uses", () => {
    // An age rating is the one field all three tabs record, so a swatch has to mean the same
    // thing on each — these sheets write BBFC bare numbers where games write PEGI.
    expect(groupToColour("rating", show({ rating: "15" }))).toBe(ageRatingToColour("15"));
    expect(groupToColour("rating", show({ rating: "18" }))).toBe(ageRatingToColour("18"));
  });

  it("paints a genre with the vocabulary Movies shares", () => {
    expect(groupToColour("genre", show({ genre: "Drama" }))).toBe(genreToColour("Drama"));
    expect(groupToColour("genre", show({ genre: "Sci-Fi" }))).not.toBe(NEUTRAL_FILL);
  });

  it("colours network and type through their own tables", () => {
    expect(groupToColour("network", show({ network: "Netflix" }))).toBe(networkToColour({ network: "Netflix" }));
    expect(groupToColour("type", show({ type: "anime" }))).toBe(typeToColour({ type: "anime" }));
  });

  it("falls back to an empty string where no vocabulary exists", () => {
    // Franchise carries no colour vocabulary on this tab — most shows name themselves in that
    // column, so a table would be near-empty; "" hands the choice to Highcharts.
    expect(groupToColour("name", show())).toBe("");
    expect(groupToColour("franchise", show())).toBe("");
    expect(groupToColour("none", show())).toBe("");
  });
});

describe("networkToColour", () => {
  it('covers every network the table names with a fill, and answers "" off it', () => {
    // "" rather than a throw: the network column gains a new streamer or studio whenever one
    // launches, and a crash is the wrong response to that — unlike a platform typo, which is.
    expect(networkToColour({ network: "Netflix" })).toMatch(/^#/);
    expect(networkToColour({ network: "Madhouse" })).toBe("");
  });
});

describe("typeToColour", () => {
  it("separates the two types with two fills", () => {
    expect(typeToColour({ type: "show" })).toMatch(/^#/);
    expect(typeToColour({ type: "anime" })).toMatch(/^#/);
    expect(typeToColour({ type: "show" })).not.toBe(typeToColour({ type: "anime" }));
  });
});

describe("typeToName", () => {
  it("title-cases the sheet's lower-case values", () => {
    // The sheet holds "show"/"anime"; a wedge or a legend entry should not.
    expect(typeToName("show")).toBe("Show");
    expect(typeToName("anime")).toBe("Anime");
  });
});
