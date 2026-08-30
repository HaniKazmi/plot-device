import { describe, expect, it } from "vitest";
import { SHOW_SECTIONS, showSections } from "../../src/show/sections";

describe("showSections", () => {
  it("offers the Now chip only when the page has a strip for it to point at", () => {
    expect(showSections(true).map((section) => section.id)).toContain(SHOW_SECTIONS.now);
    expect(showSections(false).map((section) => section.id)).not.toContain(SHOW_SECTIONS.now);
  });

  it("puts Now first, because the rail runs in the order the page does", () => {
    expect(showSections(true)[0].id).toBe(SHOW_SECTIONS.now);
  });

  it("names every other anchor whether or not anything is being watched", () => {
    const withoutNow = Object.values(SHOW_SECTIONS).filter((id) => id !== SHOW_SECTIONS.now);
    expect(showSections(false).map((section) => section.id)).toEqual(withoutNow);
  });
});
