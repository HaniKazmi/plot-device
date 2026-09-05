import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Season, Show } from "../show/types";
import type { VideoGame } from "../vg/types";

/**
 * What one row of each medium's own sheet converts to, and what one row of the union is *about* —
 * the two type arguments every `MediumModule` carries, keyed by the medium that answers them.
 *
 * The one place in the app that spells the four records out, so everything below names a medium
 * instead of a domain. Its own file rather than beside either reader: the registry pairs a module
 * with the records it takes and the library holds those same records per medium, so both need the
 * mapping, and either importing the other closes a cycle.
 *
 * Keyed rather than erased to `unknown`, because erased is what lets a walk over the four hand one
 * medium's module another medium's rows: nothing then relates a `guestFilter` to the library it
 * filters, and the mistake is a page silently emptied rather than a compile error.
 */
export interface LibraryRecord {
  game: VideoGame;
  show: Show;
  movie: Movie;
  book: Book;
}

/**
 * The unit each medium contributes to the union, which is the same record everywhere but Shows: the
 * Shows sheet converts to a `Show` and the union counts in seasons, a season being the thing
 * actually watched.
 */
export interface UnitRecord {
  game: VideoGame;
  show: Season;
  movie: Movie;
  book: Book;
}
