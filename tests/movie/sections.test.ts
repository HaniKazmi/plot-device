import { describe, expect, it } from "vitest";
import { MOVIE_SECTIONS, movieSections } from "../../src/movie/sections";

describe("movieSections", () => {
  it("runs the rail in the order the page does: Vitals, Top, Explore, Timeline, Charts, Library", () => {
    expect(movieSections().map((section) => section.id)).toEqual([
      MOVIE_SECTIONS.vitals,
      MOVIE_SECTIONS.top,
      MOVIE_SECTIONS.explore,
      MOVIE_SECTIONS.timeline,
      MOVIE_SECTIONS.charts,
      MOVIE_SECTIONS.library,
    ]);
  });

  it("carries no Now chip, since a film is watched rather than in progress", () => {
    expect(movieSections().map((section) => section.id)).not.toContain("movie-now");
  });

  it("names every anchor under MOVIE_SECTIONS exactly once", () => {
    const ids = movieSections().map((section) => section.id);

    expect(ids.sort()).toEqual(Object.values(MOVIE_SECTIONS).sort());
  });
});
