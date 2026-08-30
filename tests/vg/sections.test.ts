import { describe, expect, it } from "vitest";
import { VG_SECTIONS, vgSections } from "../../src/vg/sections";

describe("vgSections", () => {
  it("offers the Now chip only when the page has a hero for it to point at", () => {
    expect(vgSections(true).map((section) => section.id)).toContain(VG_SECTIONS.now);
    expect(vgSections(false).map((section) => section.id)).not.toContain(VG_SECTIONS.now);
  });

  it("puts Now first, because the rail runs in the order the page does", () => {
    expect(vgSections(true)[0].id).toBe(VG_SECTIONS.now);
  });

  it("names every other anchor whether or not anything is being played", () => {
    const withoutNow = Object.values(VG_SECTIONS).filter((id) => id !== VG_SECTIONS.now);
    expect(vgSections(false).map((section) => section.id)).toEqual(withoutNow);
  });
});
