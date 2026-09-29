import { describe, expect, it } from "vitest";
import { OMNIBUS_SECTIONS, omnibusSections } from "../../src/omnibus/sections";

const all = { now: true, timeline: true, charts: true, crossings: true, library: true, finished: true, genres: true };
const none = {
  now: false,
  timeline: false,
  charts: false,
  crossings: false,
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
      OMNIBUS_SECTIONS.crossings,
      OMNIBUS_SECTIONS.library,
    ]);
  });

  it("drops the Now chip when no medium has anything in flight", () => {
    expect(omnibusSections({ ...all, now: false }).map((section) => section.id)).not.toContain(OMNIBUS_SECTIONS.now);
  });

  it("drops the franchise and genre chips when those sections have nothing to draw", () => {
    // A chip scrolling to a section that is not on the page reads as broken rather than as empty.
    // Narrowing to one medium is not what empties either: a franchise one medium holds is a lane
    // and a genre one medium holds is a full bar. What empties them is their own grouping finding
    // nothing — a franchise that only ever names itself, a genre whose entries all logged zero.
    const ids = omnibusSections({ ...all, crossings: false, genres: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.crossings);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.genres);
  });

  it("drops the browse chips when the filters leave nothing to browse", () => {
    // The library empties where nothing left carries artwork, and the finished strip where nothing
    // left has closed — a year filter over an in-progress library reaches both.
    const ids = omnibusSections({ ...all, library: false, finished: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.library);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.finished);
  });

  it("drops the By Year and timeline chips when the filters leave nothing to plot", () => {
    // An empty pivot is not a picture of nothing — the plotting library falls back to an index
    // axis and a series of its own, under a header still stating the count as zero.
    const ids = omnibusSections({ ...all, charts: false, timeline: false }).map((section) => section.id);

    expect(ids).not.toContain(OMNIBUS_SECTIONS.charts);
    expect(ids).not.toContain(OMNIBUS_SECTIONS.timeline);
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
