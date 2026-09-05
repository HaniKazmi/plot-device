import { createContext, useContext } from "react";
import type { Book } from "../books/types";
import type { OmniItem } from "../common/medium";
import type { Movie } from "../movie/types";
import type { Show } from "../show/types";
import type { Medium } from "../utils/types";
import type { VideoGame } from "../vg/types";
import { MEDIA, mediaModules } from "./media";

/**
 * The four libraries as the domains model them, before anything is flattened.
 *
 * One record rather than four positional arguments: every function here takes all of them, and
 * four same-shaped arrays in a row is an ordering nothing but a type name can defend.
 *
 * `Partial` is the shape a reader holds while the sheets are still arriving: each lands on its own,
 * and a tab whose own sheet is here paints from it rather than waiting on the other three.
 */
export interface Library {
  games: VideoGame[];
  shows: Show[];
  movies: Movie[];
  books: Book[];
}

/**
 * Guest mode applied to each library by its own domain's rule, before anything is composed.
 *
 * It has to happen here rather than as one predicate over the union, because the Now band elects
 * from the domain records and never sees an `OmniItem` — a union-level predicate would keep adult
 * games out of the charts while the page headlined one. Everything downstream, elections included,
 * reads what this answers.
 *
 * The libraries are handed back by identity when the mode is off, so the common case allocates
 * nothing and every consumer below the provider re-renders only on a real change.
 */
export const visibleLibrary = (library: Partial<Library>, guestMode: boolean): Partial<Library> =>
  guestMode
    ? {
        games: library.games?.filter(MEDIA.game.guestFilter),
        shows: library.shows?.filter(MEDIA.show.guestFilter),
        movies: library.movies?.filter(MEDIA.movie.guestFilter),
        books: library.books?.filter(MEDIA.book.guestFilter),
      }
    : library;

/**
 * The four libraries once all four are here, and nothing until then.
 *
 * A page comparing four media against each other with one of them missing is not a partial answer
 * but a wrong one: a totals band would report shares of a library three quarters present, and the
 * reader has no way to tell. The test is written once so the union, the franchise index and the
 * composing tab cannot disagree about when the library is whole.
 */
export const completeLibrary = (library: Partial<Library>): Library | undefined =>
  library.games && library.shows && library.movies && library.books
    ? { games: library.games, shows: library.shows, movies: library.movies, books: library.books }
    : undefined;

/**
 * The rows a medium contributes, from the record the four are held in.
 *
 * The only thing here that knows `Library`'s own field names, which are the plural words the tabs
 * use rather than the media themselves — so nothing downstream has to spell both vocabularies.
 */
const sliceOf = (library: Library): Record<Medium, unknown[]> => ({
  game: library.games,
  show: library.shows,
  movie: library.movies,
  book: library.books,
});

/**
 * The four libraries as one flat list, each medium's arm supplied by its own module — so the unit
 * a medium contributes is decided in the folder that models it. Shows contribute seasons rather
 * than shows for that reason, which is a fact about the Shows sheet and not about the union.
 */
export const toOmniItems = (library: Library): OmniItem[] => {
  const slices = sliceOf(library);
  return mediaModules.flatMap((module) => module.toOmniItems(slices[module.medium]));
};

/**
 * The four sheets as one value, read by every tab.
 *
 * `raw` is what each converter produced and `visible` is that with guest mode applied, per medium
 * and by each domain's own rule: a tab reads its own slice off `visible`, so the mode is applied
 * once above the tabs rather than a second time inside each of them, where an index built before
 * the filter would put a hidden item straight back on screen through a card strip.
 *
 * `items` is the union, present only once all four libraries are, and built here rather than by
 * each surface that wants one: two flattenings of one library are two chances to disagree about
 * which rows guest mode hides.
 *
 * `loaded` is per medium and says whether this session holds the sheet's own rows rather than a
 * previous visit's copy, and `error` what the sheet had to say instead. Both stay per medium so a
 * tab announces its own arrival and its own bad row — a Books converter error belongs on Books, and
 * the Games tab's refresh notice must not wait on three other sheets.
 */
export interface LibraryValue {
  raw: Partial<Library>;
  visible: Partial<Library>;
  items: OmniItem[] | undefined;
  loaded: Record<Medium, boolean>;
  error: Record<Medium, string | undefined>;
}

export const LibraryContext = createContext<LibraryValue | undefined>(undefined);

/**
 * The library as the shell fetched it.
 *
 * Throws where the provider is absent rather than answering with an empty library, which would put
 * a permanently blank tab on screen with nothing anywhere saying why. Every reader is mounted
 * inside the provider by the shell itself, so the throw is a wiring mistake that fails on the first
 * render and never a state real data can reach.
 */
export const useLibrary = (): LibraryValue => {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary outside LibraryProvider");
  return value;
};
