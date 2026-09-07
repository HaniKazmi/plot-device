import { describe, expect, it } from "vitest";
import { categoryOptions, franchiseOptions, toValueArray } from "../../src/common/filterOptions";

describe("franchiseOptions", () => {
  const films = [
    { franchise: "Twilight", name: "Twilight" },
    { franchise: "Blade Runner", name: "Blade Runner 2049" },
    { franchise: "Wall-E", name: "Wall-E" },
  ];
  const offered = (series?: ReadonlySet<string>) =>
    franchiseOptions(
      films,
      (film) => film.franchise,
      (film) => film.name,
      series,
    );

  it("offers a series this tab holds one self-naming row of, where the library says it is one", () => {
    // The single Twilight film is named "Twilight"; the four Twilight books are what make it a
    // series, and this tab cannot see them. Without the set the picker offers the series on Books
    // and not on Movies, so a reader is told a film exists and given no way to reach it.
    expect(offered(new Set(["Twilight", "Blade Runner"]))).toEqual(["Blade Runner", "Twilight"]);
  });

  it("drops a standalone work whatever its own rows look like, the set being the whole test", () => {
    expect(offered(new Set(["Twilight", "Blade Runner"]))).not.toContain("Wall-E");
  });

  it("falls back to the per-tab reading with no set, which is the narrower of the two", () => {
    // Whatever a differing name offers here the library's own answer offers too, so a caller that
    // cannot answer yet lists a subset and nothing it listed is dropped once it can.
    expect(offered()).toEqual(["Blade Runner"]);
  });
});

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
