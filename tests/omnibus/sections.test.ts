import { describe, expect, it } from "vitest";
import { OMNIBUS_SECTIONS, omnibusSections } from "../../src/omnibus/sections";

const all = { now: true, crossings: true, genres: true };

describe("omnibusSections", () => {
  it("runs the rail in the order the page does", () => {
    expect(omnibusSections(all).map((section) => section.id)).toEqual([
      OMNIBUS_SECTIONS.now,
      OMNIBUS_SECTIONS.vitals,
      OMNIBUS_SECTIONS.charts,
      OMNIBUS_SECTIONS.crossings,
      OMNIBUS_SECTIONS.genres,
    ]);
  });

  it("drops the Now chip when no medium has anything in flight", () => {
    expect(omnibusSections({ ...all, now: false }).map((section) => section.id)).not.toContain(OMNIBUS_SECTIONS.now);
  });

  it("drops the crossing and genre chips when nothing spans two media", () => {
    // Both sections are empty under a single-medium view, and a chip scrolling to a section that
    // is not on the page reads as broken rather than as empty.
    const ids = omnibusSections({ now: true, crossings: false, genres: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.crossings);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.genres);
  });

  it("keeps the chips the page always renders whatever the data holds", () => {
    const ids = omnibusSections({ now: false, crossings: false, genres: false }).map((section) => section.id);

    expect(ids).toEqual([OMNIBUS_SECTIONS.vitals, OMNIBUS_SECTIONS.charts]);
  });

  it("offers only chips whose anchors the page actually renders", () => {
    // The id map names every anchor the finished page has, and a chip pointing at one that is not
    // on the page yet scrolls nowhere. The gallery and the library wall are not built, so their
    // ids are in the map and out of this list.
    const rendered: string[] = [
      OMNIBUS_SECTIONS.now,
      OMNIBUS_SECTIONS.vitals,
      OMNIBUS_SECTIONS.charts,
      OMNIBUS_SECTIONS.crossings,
      OMNIBUS_SECTIONS.genres,
    ];

    expect(omnibusSections(all).every((section) => rendered.includes(section.id))).toBe(true);
  });

  it("names each anchor it offers exactly once", () => {
    const ids = omnibusSections(all).map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
