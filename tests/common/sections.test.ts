import { describe, expect, it } from "vitest";
import { chartsLastOrder, movedAfter, tabSections } from "../../src/common/sections";

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

describe("chips in a stated order", () => {
  it("runs the chips in the order it is given, which is how a page reordered at one width stays in step with its rail", () => {
    expect(
      build()
        .chips({}, ["library", "now", "vitals"])
        .map((chip) => chip.id),
    ).toEqual(["tab-library", "tab-now", "tab-vitals"]);
  });

  it("still drops a section named false, so an order cannot put back a chip the page has no anchor for", () => {
    expect(
      build()
        .chips({ now: false }, ["library", "now", "vitals"])
        .map((chip) => chip.label),
    ).toEqual(["Library", "Vitals"]);
  });

  it("keeps every key it was declared with, so an order is the page's own list rearranged", () => {
    const { keys } = build();

    expect(keys).toEqual(["now", "vitals", "library"]);
  });
});

describe("movedAfter", () => {
  const keys = ["now", "vitals", "timeline", "charts", "library"] as const;

  it("lifts a key to sit directly after another", () => {
    expect(movedAfter(keys, "charts", "library")).toEqual(["now", "vitals", "timeline", "library", "charts"]);
  });

  it("answers a permutation of what it was given, so no section is lost or drawn twice", () => {
    expect([...movedAfter(keys, "charts", "library")].sort()).toEqual([...keys].sort());
  });

  it("leaves the order alone where either key names nothing in it", () => {
    expect(movedAfter(keys, "charts", "gallery" as (typeof keys)[number])).toEqual([...keys]);
    expect(movedAfter(keys, "gallery" as (typeof keys)[number], "library")).toEqual([...keys]);
  });

  it("leaves the order alone where a key is asked to follow itself", () => {
    expect(movedAfter(keys, "charts", "charts")).toEqual([...keys]);
  });

  it("moves a key backwards as readily as forwards, the target's own position deciding", () => {
    expect(movedAfter(keys, "library", "now")).toEqual(["now", "library", "vitals", "timeline", "charts"]);
  });

  it("does not touch the array it is handed", () => {
    const original = [...keys];
    movedAfter(keys, "charts", "library");

    expect([...keys]).toEqual(original);
  });
});

describe("chartsLastOrder", () => {
  const keys = ["now", "vitals", "timeline", "charts", "library"] as const;

  it("puts the charts after the library, which is the phone's reading order", () => {
    expect(chartsLastOrder(keys, true)).toEqual(["now", "vitals", "timeline", "library", "charts"]);
  });

  it("leaves the page's own order alone wherever the charts come first", () => {
    expect(chartsLastOrder(keys, false)).toEqual([...keys]);
  });

  it("leaves a list holding only one of the two as it is, so any tab may be ordered through it", () => {
    expect(chartsLastOrder(["now", "charts"], true)).toEqual(["now", "charts"]);
    expect(chartsLastOrder(["now", "library"], true)).toEqual(["now", "library"]);
  });
});
