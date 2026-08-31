import { describe, expect, it } from "vitest";
import { OMNIBUS_SECTIONS, omnibusSections } from "../../src/omnibus/sections";

describe("omnibusSections", () => {
  it("runs the rail in the order the page does: Now, then Vitals", () => {
    expect(omnibusSections(true).map((section) => section.id)).toEqual([OMNIBUS_SECTIONS.now, OMNIBUS_SECTIONS.vitals]);
  });

  it("drops the Now chip when no medium has anything in flight", () => {
    expect(omnibusSections(false).map((section) => section.id)).not.toContain(OMNIBUS_SECTIONS.now);
  });

  it("offers only chips whose anchors the page actually renders", () => {
    // The id map names every anchor the finished page has, and a chip pointing at one that is not
    // on the page yet scrolls nowhere and reads as broken.
    const rendered: string[] = [OMNIBUS_SECTIONS.now, OMNIBUS_SECTIONS.vitals];

    expect(omnibusSections(true).every((section) => rendered.includes(section.id))).toBe(true);
  });

  it("names each anchor it offers exactly once", () => {
    const ids = omnibusSections(true).map((section) => section.id);

    expect(new Set(ids).size).toBe(ids.length);
  });
});
