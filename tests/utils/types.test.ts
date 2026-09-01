import { describe, expect, it } from "vitest";
import {
  ageRatingBand,
  ageRatingToColour,
  genreToColour,
  isAgeRating,
  NEUTRAL_FILL,
  statusToColour,
  type AgeRating,
  type ColourableStatus,
} from "../../src/utils/types";

describe("statusToColour", () => {
  it.each([
    ["Abandoned", "#d10074"],
    ["Beat", "#338c5f"],
    ["Ended", "#338c5f"],
    ["Cancelled", "#9b6200"],
    ["Endless", "#2f75ff"],
    ["Up To Date", "#2f75ff"],
    ["Playing", "#00a5a6"],
    ["Watching", "#00a5a6"],
    ["Next", "#7d828c"],
    ["Backlog", "#7d828c"],
  ] satisfies [ColourableStatus, string][])("maps %s to %s", (status, expected) => {
    expect(statusToColour({ status })).toBe(expected);
  });

  it("keeps Cancelled and Abandoned on separate colours", () => {
    // The two are adjacent in every status chart and mean opposite things about who stopped
    // watching, so collapsing them onto one value hides the distinction rather than muting it.
    expect(statusToColour({ status: "Cancelled" })).not.toBe(statusToColour({ status: "Abandoned" }));
  });

  it("shares one colour between each domain's equivalent statuses", () => {
    // Beat/Ended and Playing/Watching are the same state in games and shows, so a stacked
    // chart mixing both domains reads as one band.
    expect(statusToColour({ status: "Beat" })).toBe(statusToColour({ status: "Ended" }));
    expect(statusToColour({ status: "Playing" })).toBe(statusToColour({ status: "Watching" }));
  });

  it("steps down in lightness from in-progress through open-ended to the terminal states", () => {
    // Lightness is a second encoding on top of hue: squinting at any status chart answers "how
    // much of this is still alive?" from brightness alone. This pins the ordering so a value
    // swap cannot silently break that reading.
    const luminance = (hex: string) => {
      const channel = (i: number) => {
        const c = parseInt(hex.slice(i, i + 2), 16) / 255;
        return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
    };
    const of = (status: ColourableStatus) => luminance(statusToColour({ status })!);

    expect(of("Playing")).toBeGreaterThan(of("Endless"));
    expect(of("Endless")).toBeGreaterThan(of("Beat"));
    expect(of("Endless")).toBeGreaterThan(of("Cancelled"));
    expect(of("Endless")).toBeGreaterThan(of("Abandoned"));
  });

  it("returns undefined for a status outside the union instead of throwing", () => {
    // The switch has no default. Domain code casts sheet cells straight to Status
    // (`row.Status as Status`), so an unrecognised cell reaches here and yields no colour.
    const unknown = statusToColour({ status: "Postponed" as ColourableStatus });

    expect(unknown).toBeUndefined();
  });
});

describe("ageRatingToColour", () => {
  it.each([
    ["3+", "#88c32f"],
    ["7+", "#6d9c26"],
    ["12+", "#c27400"],
    ["16+", "rgb(242,144,0)"],
    ["18+", "#d60015"],
  ] satisfies [AgeRating, string][])("maps the PEGI rating %s to %s", (rating, expected) => {
    expect(ageRatingToColour(rating)).toBe(expected);
  });

  it.each([
    ["3", "#88c32f"],
    ["7", "#6d9c26"],
    ["12", "#c27400"],
    ["15", "rgb(242,144,0)"],
    ["18", "#d60015"],
  ] satisfies [AgeRating, string][])("maps the BBFC rating %s to %s", (rating, expected) => {
    expect(ageRatingToColour(rating)).toBe(expected);
  });

  it("gives an age the same colour whichever board named it", () => {
    // Games record PEGI and Shows and Movies record BBFC, so the same age reaches this function
    // written two ways. A reader moving between tabs should not have to learn the ramp twice.
    expect(ageRatingToColour("12")).toBe(ageRatingToColour("12+"));
    expect(ageRatingToColour("18")).toBe(ageRatingToColour("18+"));
  });

  it("puts BBFC 15 and PEGI 16 on one band, because they are one tier", () => {
    // Neither scale holds both values, so no chart ever draws them side by side needing to tell
    // them apart — and giving the tier two colours would split it across the two tabs.
    expect(ageRatingToColour("15")).toBe(ageRatingToColour("16+"));
  });

  it("gives every age within one scale a colour of its own", () => {
    // A swatch is the only thing distinguishing two ratings at a glance, so a shared value
    // inside a single board's scale would make the badge decorative rather than informative.
    const bbfc: AgeRating[] = ["3", "7", "12", "15", "18"];
    const pegi: AgeRating[] = ["3+", "7+", "12+", "16+", "18+"];

    expect(new Set(bbfc.map(ageRatingToColour)).size).toBe(bbfc.length);
    expect(new Set(pegi.map(ageRatingToColour)).size).toBe(pegi.length);
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
    expect(() => ageRatingToColour("PG" as AgeRating)).toThrow("Unknown rating: PG");
    expect(() => ageRatingToColour("21" as AgeRating)).toThrow("Unknown rating: 21");
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
  // The distinct values both the Shows and Movies sheets' Genre columns carry.
  const liveGenres = [
    "Action",
    "Adventure",
    "Comedy",
    "Drama",
    "Fantasy",
    "Horror",
    "Mystery",
    "Romance",
    "Sci-Fi",
    "Thriller",
    "True Story",
  ];

  it.each(liveGenres)("gives %s a fill of its own rather than the neutral fallback", (genre) => {
    expect(genreToColour(genre)).not.toBe(NEUTRAL_FILL);
  });

  it("falls back to the neutral fill for a genre neither sheet has taught it yet, since the column is open-ended", () => {
    expect(genreToColour("Documentary")).toBe(NEUTRAL_FILL);
  });

  it("shares Action and Adventure's hue with the Games tab, so one hue means one genre across all three tabs", () => {
    expect(genreToColour("Action")).toBe("#fe4c00");
    expect(genreToColour("Adventure")).toBe("#13ac00");
  });
});
