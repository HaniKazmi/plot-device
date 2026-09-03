import { describe, expect, it } from "vitest";
import { MOVIE_SECTIONS, movieSections } from "../../src/movie/sections";

describe("movieSections", () => {
  it("runs the rail in the order the page does: Now, Vitals, Top, Explore, Timeline, Charts, Library", () => {
    expect(movieSections(true).map((section) => section.id)).toEqual([
      MOVIE_SECTIONS.latest,
      MOVIE_SECTIONS.vitals,
      MOVIE_SECTIONS.top,
      MOVIE_SECTIONS.explore,
      MOVIE_SECTIONS.timeline,
      MOVIE_SECTIONS.charts,
      MOVIE_SECTIONS.library,
    ]);
  });

  it("drops the Now chip when nothing survives the filters, so it never points at a missing anchor", () => {
    expect(movieSections(false).map((section) => section.id)).not.toContain(MOVIE_SECTIONS.latest);
  });

  it("keeps the anchor keyed movie-latest rather than movie-now, even though its chip now reads Now", () => {
    expect(movieSections(true).map((section) => section.id)).not.toContain("movie-now");
  });

  it("names every anchor under MOVIE_SECTIONS exactly once when everything is offered", () => {
    const ids = movieSections(true).map((section) => section.id);

    expect(ids.sort()).toEqual(Object.values(MOVIE_SECTIONS).sort());
  });
});
