import { describe, expect, it } from "vitest";
import { OMNIBUS_SECTIONS, omnibusSections } from "../../src/omnibus/sections";

const all = {
  now: true,
  timeline: true,
  charts: true,
  yearbook: true,
  franchises: true,
  library: true,
  finished: true,
  genres: true,
};
const none = {
  now: false,
  timeline: false,
  charts: false,
  yearbook: false,
  franchises: false,
  library: false,
  finished: false,
  genres: false,
};

describe("omnibusSections", () => {
  it("runs the rail in the order the page does, the timeline near the top and the library last", () => {
    expect(omnibusSections(all).map((section) => section.id)).toEqual([
      OMNIBUS_SECTIONS.now,
      OMNIBUS_SECTIONS.vitals,
      OMNIBUS_SECTIONS.timeline,
      OMNIBUS_SECTIONS.finished,
      OMNIBUS_SECTIONS.charts,
      OMNIBUS_SECTIONS.genres,
      OMNIBUS_SECTIONS.yearbook,
      OMNIBUS_SECTIONS.franchises,
      OMNIBUS_SECTIONS.library,
    ]);
  });

  it("drops the Now chip when no medium has anything in flight", () => {
    expect(omnibusSections({ ...all, now: false }).map((section) => section.id)).not.toContain(OMNIBUS_SECTIONS.now);
  });

  it("drops the genre chip when that section has nothing to draw", () => {
    // A chip scrolling to a section that is not on the page reads as broken rather than as empty.
    // Narrowing to one medium is not what empties it: a genre one medium holds is a full bar. What
    // empties it is its own grouping finding nothing — every genre's entries logging zero.
    const ids = omnibusSections({ ...all, genres: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.genres);
  });

  it("drops the browse chips when the filters leave nothing to browse", () => {
    // The library empties where nothing left carries artwork, and the finished strip where nothing
    // left has closed — a year filter over an in-progress library reaches both.
    const ids = omnibusSections({ ...all, library: false, finished: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.library);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.finished);
  });

  it("drops the By Year, timeline, yearbook and franchise chips when the filters leave nothing to plot", () => {
    // An empty pivot is not a picture of nothing — the plotting library falls back to an index
    // axis and a series of its own, under a header still stating the count as zero.
    const ids = omnibusSections({ ...all, charts: false, timeline: false, yearbook: false, franchises: false }).map(
      (section) => section.id,
    );

    expect(ids).not.toContain(OMNIBUS_SECTIONS.charts);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.timeline);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.yearbook);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.franchises);
  });

  it("keeps the vitals chip whatever the data holds, since a total of zero is an answer", () => {
    expect(omnibusSections(none).map((section) => section.id)).toEqual([OMNIBUS_SECTIONS.vitals]);
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
