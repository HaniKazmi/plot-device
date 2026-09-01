import { describe, expect, it } from "vitest";
import { relativeLuminance } from "../fixtures/colour";
import {
  ageRatingBand,
  ageRatingToColour,
  genreToColour,
  isAgeRating,
  neutralFill,
  statusToColour,
  type AgeRating,
  type ColourableStatus,
} from "../../src/utils/types";
import { liveGenres } from "../fixtures/colour";

describe("statusToColour", () => {
  it.each([
    ["Playing", "#00a2a3"],
    ["Watching", "#00a2a3"],
    ["Up To Date", "#0081e8"],
    ["Endless", "#557c00"],
    ["Beat", "#326e54"],
    ["Ended", "#326e54"],
    ["Cancelled", "#7f4d00"],
    ["Abandoned", "#9c0049"],
    ["Next", "#6e747e"],
    ["Backlog", "#6e747e"],
  ] satisfies [ColourableStatus, string][])("maps %s to %s on the light paper", (status, expected) => {
    expect(statusToColour({ status }, "light")).toBe(expected);
  });

  it("keeps Cancelled and Abandoned on separate colours", () => {
    // The two are adjacent in every status chart and mean opposite things about who stopped
    // watching, so collapsing them onto one value hides the distinction rather than muting it.
    expect(statusToColour({ status: "Cancelled" }, "light")).not.toBe(statusToColour({ status: "Abandoned" }, "light"));
  });

  it("shares one colour between each domain's equivalent statuses", () => {
    // Beat/Ended and Playing/Watching are the same state in games and shows, so a stacked
    // chart mixing both domains reads as one band.
    expect(statusToColour({ status: "Beat" }, "light")).toBe(statusToColour({ status: "Ended" }, "light"));
    expect(statusToColour({ status: "Playing" }, "light")).toBe(statusToColour({ status: "Watching" }, "light"));
  });

  it("keeps Endless and Up To Date apart, because they are not one state", () => {
    // Up To Date is a show still running that you are current on — waiting on the source. Endless
    // is a game with no completion state at all, which is a way of being done rather than of
    // being in progress, and it sits with the greens beside Beat/Ended.
    expect(statusToColour({ status: "Endless" }, "light")).not.toBe(statusToColour({ status: "Up To Date" }, "light"));
  });

  it.each(["light", "dark"] as const)(
    "steps down in lightness from in-progress through open-ended to the terminal states, on %s",
    (scheme) => {
      // Lightness is a second encoding on top of hue: squinting at any status chart answers "how
      // much of this is still alive?" from brightness alone. Both halves have to carry it — they
      // are separate sets of hexes, so an ordering pinned on one says nothing about the other, and
      // the reader whose system is dark is the one who never sees the half that was checked.
      const of = (status: ColourableStatus) => relativeLuminance(statusToColour({ status }, scheme)!);

      expect(of("Playing")).toBeGreaterThan(of("Endless"));
      expect(of("Endless")).toBeGreaterThan(of("Beat"));
      expect(of("Endless")).toBeGreaterThan(of("Cancelled"));
      expect(of("Endless")).toBeGreaterThan(of("Abandoned"));
    },
  );

  it("returns undefined for a status outside the union instead of throwing", () => {
    // The switch has no default. Domain code casts sheet cells straight to Status
    // (`row.Status as Status`), so an unrecognised cell reaches here and yields no colour.
    const unknown = statusToColour({ status: "Postponed" as ColourableStatus }, "light");

    expect(unknown).toBeUndefined();
  });
});

describe("ageRatingToColour", () => {
  it.each([
    ["3+", "#14ac00"],
    ["7+", "#707400"],
    ["12+", "#be7e00"],
    ["16+", "#aa4600"],
    ["18+", "#a10017"],
  ] satisfies [AgeRating, string][])("maps the PEGI rating %s to %s on the light paper", (rating, expected) => {
    expect(ageRatingToColour(rating, "light")).toBe(expected);
  });

  it.each([
    ["3", "#22fb00"],
    ["7", "#a9ae00"],
    ["12", "#fdaa00"],
    ["15", "#dd5e00"],
    ["18", "#de0024"],
  ] satisfies [AgeRating, string][])("maps the BBFC rating %s to %s on the dark paper", (rating, expected) => {
    expect(ageRatingToColour(rating, "dark")).toBe(expected);
  });

  it("gives an age the same colour whichever board named it", () => {
    // Games record PEGI and Shows and Movies record BBFC, so the same age reaches this function
    // written two ways. A reader moving between tabs should not have to learn the ramp twice.
    expect(ageRatingToColour("12", "light")).toBe(ageRatingToColour("12+", "light"));
    expect(ageRatingToColour("18", "light")).toBe(ageRatingToColour("18+", "light"));
  });

  it("puts BBFC 15 and PEGI 16 on one band, because they are one tier", () => {
    // Neither scale holds both values, so no chart ever draws them side by side needing to tell
    // them apart — and giving the tier two colours would split it across the two tabs.
    expect(ageRatingToColour("15", "light")).toBe(ageRatingToColour("16+", "light"));
  });

  it("gives every age within one scale a colour of its own", () => {
    // A swatch is the only thing distinguishing two ratings at a glance, so a shared value
    // inside a single board's scale would make the badge decorative rather than informative.
    const bbfc: AgeRating[] = ["3", "7", "12", "15", "18"];
    const pegi: AgeRating[] = ["3+", "7+", "12+", "16+", "18+"];

    expect(new Set(bbfc.map((rating) => ageRatingToColour(rating, "light"))).size).toBe(bbfc.length);
    expect(new Set(pegi.map((rating) => ageRatingToColour(rating, "light"))).size).toBe(pegi.length);
  });

  it("rejects a certificate neither board issues", () => {
    // PEGI has no 15 and BBFC no 16, so the ten valid values are listed rather than crossed with
    // an optional suffix — a cross product would accept both of these, which is the shape the
    // likeliest typo takes.
    expect(isAgeRating("15+")).toBe(false);
    expect(isAgeRating("16")).toBe(false);
    expect(isAgeRating("15")).toBe(true);
    expect(isAgeRating("16+")).toBe(true);
  });

  it("throws on a rating outside the union rather than falling back", () => {
    // Every domain casts a sheet cell straight to AgeRating, so a typo or a certificate from a
    // board neither scale covers arrives here. Throwing surfaces it; a fallback colour would
    // render the wrong badge in silence.
    expect(() => ageRatingToColour("PG" as AgeRating, "light")).toThrow("Unknown rating: PG");
    expect(() => ageRatingToColour("21" as AgeRating, "light")).toThrow("Unknown rating: 21");
  });
});

describe("ageRatingBand", () => {
  it("names one tier once, whichever board wrote the certificate", () => {
    // A grouping over the raw cell splits every tier by its suffix, so the same age stands as two
    // groups and the two halves are drawn in the same colour beside each other.
    expect(ageRatingBand("12")).toBe(ageRatingBand("12+"));
    expect(ageRatingBand("18")).toBe(ageRatingBand("18+"));
  });

  it("puts BBFC 15 and PEGI 16 on one band, the tier whose number the boards disagree on", () => {
    expect(ageRatingBand("15")).toBe(ageRatingBand("16+"));
  });

  it("names that band after both numbers, since no sheet writes a PEGI 16 game as a 15", () => {
    expect(ageRatingBand("16+")).toBe("15/16");
    expect(ageRatingBand("12+")).toBe("12");
  });

  it("leaves the ten certificates as five bands, one per age the library records", () => {
    const every: AgeRating[] = ["3", "7", "12", "15", "18", "3+", "7+", "12+", "16+", "18+"];

    expect(new Set(every.map(ageRatingBand)).size).toBe(5);
  });

  it("throws on a certificate outside the union rather than banding it as something", () => {
    // The colour is looked up by band, so a fallback here would reach the swatch as a wrong
    // colour rather than as an error naming the value.
    expect(() => ageRatingBand("PG" as AgeRating)).toThrow("Unknown rating: PG");
  });
});

describe("genreToColour", () => {
  // All three Genre columns are written in this one vocabulary, which is what lets the Omnibus
  // bridge a game to a film under one name. A value off the table renders as "no colour yet"
  // rather than throwing, so a typo in a sheet is invisible unless something asserts the set.
  it.each(liveGenres)("gives %s a fill of its own rather than the neutral fallback", (genre) => {
    expect(genreToColour(genre, "light")).not.toBe(neutralFill("light"));
  });

  it("falls back to the neutral fill for a genre neither sheet has taught it yet, since the column is open-ended", () => {
    expect(genreToColour("Documentary", "light")).toBe(neutralFill("light"));
  });

  it("leaves Other off the table, so the top-N bucket cannot be read as a genre", () => {
    // `topNWithOther` names its overflow bucket "Other", and a legend row drawn in a genre's own
    // colour would claim the tail is one. The neutral is what says it stands for several at once.
    expect(genreToColour("Other", "light")).toBe(neutralFill("light"));
  });
});
