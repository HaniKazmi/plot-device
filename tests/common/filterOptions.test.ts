import { describe, expect, it } from "vitest";
import { categoryOptions, toValueArray } from "../../src/common/filterOptions";

describe("categoryOptions", () => {
  it("returns each distinct value once, sorted", () => {
    const data = [{ genre: "Puzzle" }, { genre: "Action" }, { genre: "Puzzle" }];

    expect(categoryOptions(data, (item) => item.genre)).toEqual(["Action", "Puzzle"]);
  });

  it("keeps an empty value, sorted to the front", () => {
    // Nothing filters blanks out, so a sheet with an unfilled cell renders a blank option — the
    // sort order is what makes that visible at the top rather than buried mid-list.
    const data = [{ genre: "Action" }, { genre: "" }];

    expect(categoryOptions(data, (item) => item.genre)).toEqual(["", "Action"]);
  });

  it("reads the value through the accessor, so derived categories cost the caller a function", () => {
    const data = [{ nested: { network: "HBO" } }, { nested: { network: "BBC" } }];

    expect(categoryOptions(data, (item) => item.nested.network)).toEqual(["BBC", "HBO"]);
  });
});

describe("toValueArray", () => {
  it("splits MUI's comma-joined string form", () => {
    expect(toValueArray("a,b")).toEqual(["a", "b"]);
  });

  it("passes an array form through as an array", () => {
    expect(toValueArray(["a", "b"])).toEqual(["a", "b"]);
  });
});
