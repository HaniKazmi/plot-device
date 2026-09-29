import { describe, expect, it } from "vitest";
import { tabSections, trackedTabSections } from "../../src/common/sections";

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

describe("trackedTabSections", () => {
  it("runs every tracked tab's page in one order: Now, Vitals, Top, Explore, Timeline, Charts, Library", () => {
    const { ids, chips } = trackedTabSections("games");

    expect(chips().map((chip) => chip.label)).toEqual([
      "Now",
      "Vitals",
      "Top",
      "Explore",
      "Timeline",
      "Charts",
      "Library",
    ]);
    expect(ids.now).toBe("games-now");
    expect(ids.library).toBe("games-library");
  });

  it("lets a tab name its first anchor, the chip reading Now regardless", () => {
    // A film is watched rather than in progress, so Movies keys the anchor `latest`.
    const { ids, chips } = trackedTabSections("movies", "latest");

    expect(ids.latest).toBe("movies-latest");
    expect(chips({ latest: false }).map((chip) => chip.label)).not.toContain("Now");
    expect(chips()[0]).toEqual({ id: "movies-latest", label: "Now" });
  });
});
