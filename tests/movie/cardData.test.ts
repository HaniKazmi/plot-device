import { describe, expect, it } from "vitest";
import { movieRows, movieSubtitle } from "../../src/movie/cardData";
import { genreToColour } from "../../src/utils/types";
import { movie } from "../fixtures/movies";

describe("movieSubtitle", () => {
  it("names the director then the genre, so the hero, the hover card and the Omnibus's Now card agree", () => {
    const film = movie({ director: "Denis Villeneuve", genre: "Sci-Fi" });

    expect(movieSubtitle(film, "light")).toEqual([
      { text: "Denis Villeneuve" },
      { text: "Sci-Fi", swatch: genreToColour("Sci-Fi", "light") },
    ]);
  });

  it("wears the genre swatch the ledger row and every genre wedge on the tab wear", () => {
    const film = movie({ genre: "Horror" });

    // Reading the swatch back through the same lookup the ledger uses is what keeps the two from
    // drifting apart, rather than pinning a literal hex that only one of them still matches.
    expect(movieSubtitle(film, "dark")[1].swatch).toBe(genreToColour("Horror", "dark"));
  });
});

describe("movieRows", () => {
  it("states the series where the film has one, and leaves a standalone without the row", () => {
    const series = (film: ReturnType<typeof movie>) => movieRows(film, "light").find((row) => row.label === "Series");

    expect(series(movie({ series: "Alien", seriesNumber: 0.5, franchise: "Alien" }))?.value).toBe("#0.5 · Alien");
    expect(series(movie({ series: "" }))).toBeUndefined();
  });

  it("states the franchise for a standalone film too, a work being a franchise of one", () => {
    const franchise = movieRows(movie({ name: "Arrival", franchise: "Arrival" }), "light").find(
      (row) => row.label === "Franchise",
    );

    expect(franchise).toMatchObject({ value: "Arrival", parts: [{ text: "Arrival", category: "franchise" }] });
  });

  it("names each genre and the director as the value of its own category, so each can lead to its layer", () => {
    const rows = movieRows(movie({ director: "Denis Villeneuve", genre: "Sci-Fi", otherGenres: ["Drama"] }), "light");
    const parts = (label: string) => rows.find((row) => row.label === label)?.parts;

    expect(parts("By")).toEqual([{ text: "Denis Villeneuve", category: "director" }]);
    expect(parts("Genre")).toEqual([
      { text: "Sci-Fi", category: "genre" },
      { text: "Drama", category: "genre" },
    ]);
    expect(rows.find((row) => row.label === "Genre")?.value).toBe("Sci-Fi · Drama");
  });
});
