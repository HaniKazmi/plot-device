import { describe, expect, it } from "vitest";
import { relativeLuminance } from "../fixtures/colour";
import {
  certificateBand,
  certificateToColour,
  genreToColour,
  isCertificate,
  neutralFill,
  statusToColour,
  type Certificate,
  type ColourableStatus,
} from "../../src/utils/types";
import { liveGenres } from "../fixtures/colour";

describe("statusToColour", () => {
  it.each([
    ["Playing", "#00a2a3"],
    ["Watching", "#00a2a3"],
    ["Reading", "#00a2a3"],
    ["Up To Date", "#0081e8"],
    ["Endless", "#557c00"],
    ["Beat", "#326e54"],
    ["Ended", "#326e54"],
    ["Finished", "#326e54"],
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
    // Beat/Ended/Finished and Playing/Watching/Reading are one state each in games, shows and
    // books, so a stacked chart mixing the domains reads as one band.
    expect(statusToColour({ status: "Beat" }, "light")).toBe(statusToColour({ status: "Ended" }, "light"));
    expect(statusToColour({ status: "Beat" }, "light")).toBe(statusToColour({ status: "Finished" }, "light"));
    expect(statusToColour({ status: "Playing" }, "light")).toBe(statusToColour({ status: "Watching" }, "light"));
    expect(statusToColour({ status: "Playing" }, "light")).toBe(statusToColour({ status: "Reading" }, "light"));
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

describe("certificateToColour", () => {
  it.each([
    ["3", "#14ac00"],
    ["7", "#707400"],
    ["12", "#be7e00"],
    ["16", "#aa4600"],
    ["18", "#a10017"],
  ] satisfies [Certificate, string][])("maps the certificate %s to %s on the light paper", (certificate, expected) => {
    expect(certificateToColour(certificate, "light")).toBe(expected);
  });

  it.each([
    ["3", "#22fb00"],
    ["7", "#a9ae00"],
    ["12", "#fdaa00"],
    ["15", "#dd5e00"],
    ["18", "#de0024"],
  ] satisfies [Certificate, string][])("maps the certificate %s to %s on the dark paper", (certificate, expected) => {
    expect(certificateToColour(certificate, "dark")).toBe(expected);
  });

  it("gives BBFC 15 and PEGI 16 one colour, because they are one tier", () => {
    // The boards agree on every tier but this one, where BBFC issues a 15 and PEGI a 16 for the
    // same thing. Two colours would split one tier across the two tabs that record it.
    expect(certificateToColour("15", "light")).toBe(certificateToColour("16", "light"));
  });

  it("gives every tier beside that one a colour of its own", () => {
    // A swatch is the only thing distinguishing two certificates at a glance, so a value shared
    // outside the 15/16 tier would make the badge decorative rather than informative.
    const tiers: Certificate[] = ["3", "7", "12", "15", "18"];

    expect(new Set(tiers.map((certificate) => certificateToColour(certificate, "light"))).size).toBe(tiers.length);
  });

  it("rejects a suffixed certificate, which no sheet writes", () => {
    // Every tab records the bare age, so a suffix is a cell in a notation this library does not
    // hold rather than a certificate it can colour.
    expect(isCertificate("16+")).toBe(false);
    expect(isCertificate("12+")).toBe(false);
    expect(isCertificate("15")).toBe(true);
    expect(isCertificate("16")).toBe(true);
  });

  it("throws on a certificate outside the union rather than falling back", () => {
    // Every domain casts a sheet cell straight to Certificate, so a typo or a certificate from a
    // board neither scale covers arrives here. Throwing surfaces it; a fallback colour would
    // render the wrong badge in silence.
    expect(() => certificateToColour("PG" as Certificate, "light")).toThrow("Unknown certificate: PG");
    expect(() => certificateToColour("21" as Certificate, "light")).toThrow("Unknown certificate: 21");
  });
});

describe("certificateBand", () => {
  it("puts BBFC 15 and PEGI 16 on one band, the tier whose number the boards disagree on", () => {
    // Grouped on the raw cell these stand as two shelves saying the same thing. The band is what
    // a chart and a shelf both key on, so neither can split the tier the other keeps whole.
    expect(certificateBand("15")).toBe(certificateBand("16"));
  });

  it("names that band after both numbers, since no sheet writes a PEGI 16 game as a 15", () => {
    expect(certificateBand("16")).toBe("15/16");
    expect(certificateBand("12")).toBe("12");
  });

  it("leaves the six certificates as five bands, the tiers the boards between them name", () => {
    const every: Certificate[] = ["3", "7", "12", "15", "16", "18"];

    expect(new Set(every.map(certificateBand)).size).toBe(5);
  });

  it("throws on a certificate outside the union rather than banding it as something", () => {
    // The colour is looked up by band, so a fallback here would reach the swatch as a wrong
    // colour rather than as an error naming the value.
    expect(() => certificateBand("PG" as Certificate)).toThrow("Unknown certificate: PG");
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
