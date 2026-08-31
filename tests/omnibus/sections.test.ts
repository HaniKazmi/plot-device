import { describe, expect, it } from "vitest";
import { OMNIBUS_SECTIONS, omnibusSections } from "../../src/omnibus/sections";

const all = { now: true, crossings: true, gallery: true, finished: true, genres: true };
const none = { now: false, crossings: false, gallery: false, finished: false, genres: false };

describe("omnibusSections", () => {
  it("runs the rail in the order the page does", () => {
    expect(omnibusSections(all).map((section) => section.id)).toEqual([
      OMNIBUS_SECTIONS.now,
      OMNIBUS_SECTIONS.vitals,
      OMNIBUS_SECTIONS.charts,
      OMNIBUS_SECTIONS.crossings,
      OMNIBUS_SECTIONS.gallery,
      OMNIBUS_SECTIONS.finished,
      OMNIBUS_SECTIONS.genres,
    ]);
  });

  it("drops the Now chip when no medium has anything in flight", () => {
    expect(omnibusSections({ ...all, now: false }).map((section) => section.id)).not.toContain(OMNIBUS_SECTIONS.now);
  });

  it("drops the crossing and genre chips when nothing spans two media", () => {
    // Both sections are empty under a single-medium view, and a chip scrolling to a section that
    // is not on the page reads as broken rather than as empty.
    const ids = omnibusSections({ ...all, crossings: false, genres: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.crossings);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.genres);
  });

  it("drops the browse chips when the filters leave nothing to browse", () => {
    // The gallery empties where nothing left carries artwork, and the finished strip where nothing
    // left has closed — a year filter over an in-progress library reaches both.
    const ids = omnibusSections({ ...all, gallery: false, finished: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.gallery);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.finished);
  });

  it("keeps the chips the page always renders whatever the data holds", () => {
    expect(omnibusSections(none).map((section) => section.id)).toEqual([
      OMNIBUS_SECTIONS.vitals,
      OMNIBUS_SECTIONS.charts,
    ]);
  });

  it("offers only chips whose anchors the page actually renders", () => {
    // The id map names every anchor the finished page has, and a chip pointing at one that is not
    // on the page scrolls nowhere. Every id in the map is now rendered by a section.
    const rendered: string[] = Object.values(OMNIBUS_SECTIONS);

    expect(omnibusSections(all).every((section) => rendered.includes(section.id))).toBe(true);
  });

  it("names each anchor it offers exactly once", () => {
    const ids = omnibusSections(all).map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
