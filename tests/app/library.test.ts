import { describe, expect, it } from "vitest";
import { completeLibrary, visibleLibrary } from "../../src/app/library";
import { book } from "../fixtures/books";
import { library } from "../fixtures/library";
import { movie } from "../fixtures/movies";
import { show } from "../fixtures/shows";
import { videoGame } from "../fixtures/vgRows";

describe("guest mode", () => {
  const adult = videoGame({ theme: ["Adult"] });
  const anime = show({ type: "anime" });
  const animeFilm = movie({ anime: true });
  const full = library({
    games: [videoGame(), adult],
    shows: [show(), anime],
    movies: [movie(), animeFilm],
    books: [book()],
  });

  it("applies each domain's own rule to its own library", () => {
    const visible = visibleLibrary(full, true);

    expect(visible.games).not.toContain(adult);
    expect(visible.shows).not.toContain(anime);
    expect(visible.movies).not.toContain(animeFilm);
    // Nothing on the Books sheet marks a book, so that rule keeps the whole library.
    expect(visible.books).toEqual(full.books);
  });

  it("hands back the libraries untouched when it is off", () => {
    // By identity, so a page below the provider re-renders on a real change and not on every one.
    expect(visibleLibrary(full, false)).toBe(full);
  });

  it("leaves a library that has not arrived absent rather than empty", () => {
    // The sheets land one at a time, and an empty array is a library with nothing in it — which
    // every reader of the union treats as an answer.
    const visible = visibleLibrary({ games: [adult, videoGame()] }, true);

    expect(visible.games).toHaveLength(1);
    expect(visible.shows).toBeUndefined();
  });
});

describe("the whole library", () => {
  it("is nothing until every medium has arrived", () => {
    expect(completeLibrary({ games: [], shows: [], movies: [] })).toBeUndefined();
  });

  it("answers with all four once they have, empty ones included", () => {
    // An empty sheet is an arrival: a page that waited for a row would never draw a library that
    // legitimately holds none.
    expect(completeLibrary(library())).toEqual(library());
  });
});
