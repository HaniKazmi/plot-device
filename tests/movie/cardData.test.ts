import { describe, expect, it } from "vitest";
import { movieCredit, movieRows, movieSubtitle } from "../../src/movie/cardData";
import { cinemaToColour } from "../../src/movie/types";
import { genreToColour } from "../../src/utils/types";
import { movie } from "../fixtures/movies";

describe("movieSubtitle", () => {
  it("names where it was watched, then the director, then the genre, so the hero and the hover card agree", () => {
    const film = movie({ cinema: true, director: "Denis Villeneuve", genre: "Sci-Fi" });

    expect(movieSubtitle(film, "light")).toEqual([
      { text: "Cinema", swatch: cinemaToColour("Cinema", "light") },
      { text: "Denis Villeneuve" },
      { text: "Sci-Fi", swatch: genreToColour("Sci-Fi", "light") },
    ]);
  });

  it("wears the swatches the Seen In band and every genre wedge on the tab wear", () => {
    const film = movie({ cinema: false, genre: "Horror" });

    // Reading the swatch back through the same lookup the ledger uses is what keeps the two from
    // drifting apart, rather than pinning a literal hex that only one of them still matches.
    expect(movieSubtitle(film, "dark")[0].swatch).toBe(cinemaToColour("Home", "dark"));
    expect(movieSubtitle(film, "dark")[2].swatch).toBe(genreToColour("Horror", "dark"));
  });
});

describe("movieCredit", () => {
  it("is the subtitle less its venue, for the Now card's one line", () => {
    const film = movie({ director: "Denis Villeneuve", genre: "Sci-Fi" });

    expect(movieCredit(film, "light")).toEqual(movieSubtitle(film, "light").slice(1));
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

  it("names the director and the primary genre as values of their categories, the rest as words", () => {
    const rows = movieRows(movie({ director: "Denis Villeneuve", genre: "Sci-Fi", otherGenres: ["Drama"] }), "light");
    const parts = (label: string) => rows.find((row) => row.label === label)?.parts;

    expect(parts("By")).toEqual([{ text: "Denis Villeneuve", category: "director" }]);
    // The genre category reads the primary genre alone, so only it leads to a layer holding the film.
    expect(parts("Genre")).toEqual([{ text: "Sci-Fi", category: "genre" }, { text: "Drama" }]);
    expect(rows.find((row) => row.label === "Genre")?.value).toBe("Sci-Fi · Drama");
  });
});
