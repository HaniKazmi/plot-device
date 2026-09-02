import { describe, expect, it } from "vitest";
import { movieSubtitle } from "../../src/movie/cardData";
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
