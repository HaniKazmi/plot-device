import { describe, expect, it } from "vitest";
import { tabSections } from "../../src/common/sections";

const build = () =>
  tabSections("tab", [
    { key: "now", label: "Now" },
    { key: "vitals", label: "Vitals" },
    { key: "library", label: "Library" },
  ]);

describe("tabSections", () => {
  it("prefixes every anchor with the tab's own id, which is what keeps two tabs' anchors apart", () => {
    expect(build().ids).toEqual({ now: "tab-now", vitals: "tab-vitals", library: "tab-library" });
  });

  it("offers every chip in page order when nothing is said about any of them", () => {
    expect(
      build()
        .chips()
        .map((chip) => chip.id),
    ).toEqual(["tab-now", "tab-vitals", "tab-library"]);
  });

  it("drops only the sections named false, so a page states what it conditions and nothing else", () => {
    expect(
      build()
        .chips({ now: false })
        .map((chip) => chip.label),
    ).toEqual(["Vitals", "Library"]);
  });

  it("keeps a section named true, so a caller can pass one flag per conditional section", () => {
    expect(
      build()
        .chips({ now: true })
        .map((chip) => chip.label),
    ).toEqual(["Now", "Vitals", "Library"]);
  });

  it("points a chip at the anchor of the same name, which is the pair that has to agree", () => {
    const { ids, chips } = build();

    expect(chips().map((chip) => chip.id)).toEqual(Object.values(ids));
  });
});
