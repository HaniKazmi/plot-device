import { describe, expect, it } from "vitest";
import { VG_SECTIONS, vgSections } from "../../src/vg/sections";

describe("vgSections", () => {
  it("offers the Now chip only when the page has a hero for it to point at", () => {
    expect(vgSections(true, false).map((section) => section.id)).toContain(VG_SECTIONS.now);
    expect(vgSections(false, false).map((section) => section.id)).not.toContain(VG_SECTIONS.now);
  });

  it("puts Now first, because the rail runs in the order the page does", () => {
    expect(vgSections(true, false)[0].id).toBe(VG_SECTIONS.now);
  });

  it("puts Charts after Library where the page does, so the rail's order stays the page's order", () => {
    const ids = vgSections(true, true).map((section) => section.id);

    expect(ids.indexOf(VG_SECTIONS.charts)).toBeGreaterThan(ids.indexOf(VG_SECTIONS.library));
    expect(ids.at(-1)).toBe(VG_SECTIONS.charts);
  });

  it("names the same anchors either way round, the phone reordering the page rather than cutting it", () => {
    const inOrder = vgSections(true, false).map((section) => section.id);
    const chartsLast = vgSections(true, true).map((section) => section.id);

    expect([...chartsLast].sort()).toEqual([...inOrder].sort());
  });

  it("names every other anchor whether or not anything is being played", () => {
    const withoutNow = Object.values(VG_SECTIONS).filter((id) => id !== VG_SECTIONS.now);
    expect(vgSections(false, false).map((section) => section.id)).toEqual(withoutNow);
  });
});
