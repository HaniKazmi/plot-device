import type { Year, YearMonthDay, YearNumber } from "../common/date";
import type { AgeRating } from "../utils/types";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Season, Show } from "../show/types";
import type { VideoGame } from "../vg/types";
import { guestFilter as movieGuestFilter } from "../movie/filterUtils";
import { guestFilter as showGuestFilter } from "../show/filterUtils";
import { guestFilter as vgGuestFilter } from "../vg/filterUtils";
import { currentlyReading, bookKey } from "../books/statsData";
import { latestWatched } from "../movie/statsData";
import { currentlyWatching, heroSeason } from "../show/statsData";
import { currentlyPlaying } from "../vg/statsData";
import { spanKey as gameSpanKey } from "../vg/cardData";
import { media, type Measure, type Medium } from "./types";
import { earliestYear as earliestYearOf } from "../common/statsData";
import "../utils/arrayUtils";

/**
 * The four libraries as the domains model them, before anything is flattened.
 *
 * One record rather than four positional arguments: every function here takes all of them, and
 * four same-shaped arrays in a row is an ordering nothing but a type name can defend.
 */
export interface Library {
  games: VideoGame[];
  shows: Show[];
  movies: Movie[];
  books: Book[];
}

/**
 * One thing watched, played or read, in the vocabulary the four media share.
 *
 * `source` keeps the record it was built from, so a card adapter renders the domain's own artwork
 * and detail panel rather than a second, poorer copy of it. That a `Season` source carries a
 * `show` back-reference is safe here only because **Omnibus writes no cache of its own**: it reads
 * the four domains' caches through their own configs, and the `show` key is dropped and revived
 * by the pair that travels with the Shows config. An `OmniItem` may itself never carry a field
 * named `show`, and needs no replacer/reviver rules, for exactly that reason — the day this tab
 * caches anything, both facts stop holding.
 */
export interface OmniItem {
  medium: Medium;
  /**
   * What identifies this item among the union, for a React key and for a card's own name.
   *
   * Built from the tuple its own domain already treats as unique — a game's title, platform and
   * start; a show's name and season number; a film's title and watch date — because no field the
   * union shares is one. Every season of a show carries its show's name, a film watched twice is
   * two rows with one title, and a game's close can be a bare year, so two copies of one title on
   * two platforms finished in that year answer identically on medium, name and close together.
   */
  key: string;
  /** A season answers with its show's name; which season it is stays on `source`. */
  name: string;
  /**
   * When it finished, absent while it is still going. A film has no separate close — being
   * watched is the whole of it — so its watch date is also its close.
   *
   * The two concrete kinds all three sheets record, rather than a bare `PlainDate`: a card states
   * this date in the reader's own form, and `formatDate` takes the kinds that have one. A
   * `YearMonth` has no such form and no sheet holds one.
   */
  closeDate?: YearMonthDay | Year;
  /**
   * The year it counts towards: the year it ended, or the year it started where it has not.
   * Always answerable, since every record in all three sheets carries a start.
   */
  year: YearNumber;
  /**
   * Exact hours, so a total is floored once at the end rather than per item. Flooring here would
   * count a 96-minute film as one hour and drop a fifth of the movie library, and Omnibus's
   * per-medium totals would then disagree with the figure each home tab shows for the same rows.
   */
  hours: number;
  genre: string;
  /** The genres beyond the primary one. Empty for a game or a book: those sheets record one. */
  genres: string[];
  franchise: string;
  /**
   * Absent for a book: nothing certifies one. Every surface grouping on the certificate drops an
   * item with none rather than shelving it under a blank — the one category not every medium
   * records, stated here rather than answered with a rating nobody issued.
   */
  rating?: AgeRating;
  source: VideoGame | Season | Movie | Book;
}

/**
 * Guest mode applied to each library by its own domain's rule, before anything is composed.
 *
 * It has to happen here rather than as one predicate over the union, because the Now band elects
 * from the domain records and never sees an `OmniItem` — a union-level predicate would keep adult
 * games out of the charts while the page headlined one. Everything downstream, elections included,
 * reads what this answers.
 */
export const visibleLibrary = (library: Library, guestMode: boolean): Library =>
  guestMode
    ? {
        games: library.games.filter(vgGuestFilter),
        shows: library.shows.filter(showGuestFilter),
        movies: library.movies.filter(movieGuestFilter),
        // Nothing on the Books sheet marks a book for the mode to hide.
        books: library.books,
      }
    : library;

/**
 * The four libraries as one flat list.
 *
 * Seasons are the unit a show contributes, not the show: a show runs for years and a season is
 * the thing that was actually watched in one of them, which is what makes it comparable to a game
 * beaten, a film seen or a book read. The season carries its show's name, genre, franchise and
 * certificate, since those are facts about the show rather than about the season.
 */
export const toOmniItems = ({ games, shows, movies, books }: Library): OmniItem[] => [
  ...games.map((game): OmniItem => ({
    medium: "game",
    // The tuple the Games tab already keys a span by: a title on its own repeats across the
    // platforms a game was played on and across a replay of it.
    key: `game-${gameSpanKey(game)}`,
    name: game.name,
    closeDate: game.endDate,
    year: (game.endDate ?? game.startDate).year,
    hours: game.hours ?? 0,
    genre: game.genre,
    genres: [],
    franchise: game.franchise,
    rating: game.rating,
    source: game,
  })),
  ...shows.flatMap((show) =>
    show.s.map((season): OmniItem => ({
      medium: "show",
      // The show's name and the season number, which is what the Shows tab keys a season by:
      // every season of a show carries its show's name and only the number separates them.
      key: `show-${show.name}-S${season.s}`,
      name: show.name,
      closeDate: season.endDate,
      year: (season.endDate ?? season.startDate).year,
      hours: season.minutes / 60,
      genre: show.genre,
      genres: show.genres,
      franchise: show.franchise,
      rating: show.rating,
      source: season,
    })),
  ),
  ...movies.map((movie): OmniItem => ({
    medium: "movie",
    // A rewatch is a second row with the same title, and the day it was seen is what separates the
    // two — the converter rejects a Watch Date that is not a full one, so it always can.
    key: `movie-${movie.name}-${movie.startDate}`,
    name: movie.name,
    // A film's watch date is both when it happened and when it closed, so it is one date wearing
    // both names rather than a start with no end.
    closeDate: movie.startDate,
    year: movie.startDate.year,
    hours: movie.minutes / 60,
    genre: movie.genre,
    genres: movie.genres,
    franchise: movie.franchise,
    rating: movie.rating,
    source: movie,
  })),
  ...books.map((book): OmniItem => ({
    medium: "book",
    // The tuple the Books tab keys a card by: a reread is a second row with the same title, and
    // the day it was begun is what separates the two.
    key: `book-${bookKey(book)}`,
    name: book.name,
    closeDate: book.endDate,
    year: (book.endDate ?? book.startDate).year,
    hours: book.hours,
    genre: book.genre,
    genres: [],
    franchise: book.franchise,
    source: book,
  })),
];

/**
 * Hours over a set of items, floored once.
 *
 * The single home of the floor, so no surface on this tab shows a fraction of an hour and every
 * total is the floor of the sum rather than the sum of the floors — the figure each home tab
 * quotes for the same rows.
 */
export const omniHours = (items: OmniItem[]) => Math.floor(items.sum("hours"));

/** What a set of items counts for under the active measure. */
export const measureOf = (items: OmniItem[], measure: Measure) =>
  measure === "Hours" ? omniHours(items) : items.length;

/**
 * What the page opens with: hours, items, and the number of distinct years anything falls in.
 *
 * Active years rather than a span, because a span counts the years nothing happened in — and on a
 * library assembled from three sheets with different start dates, that is the whole difference
 * between "twenty-two years of this" and "twenty-two years since the first row".
 */
export const unionTotals = (items: OmniItem[]) => ({
  hours: omniHours(items),
  items: items.length,
  years: new Set(items.map((item) => item.year)).size,
});

/**
 * The artwork an item is shown as, which is its own tab's: a season is drawn as its show, since
 * the sheets hold one banner per show and a season has no picture of its own.
 *
 * The browse surfaces are walls of pictures, so an item with none is not on them — the rule
 * `finishedItems` already applies to every domain's library grid. A switch rather than a test for
 * the one medium that differs, so a medium this does not know is a compile error and not a cast.
 */
export const omniBanner = (item: OmniItem): string | undefined => {
  switch (item.medium) {
    case "show":
      return (item.source as Season).show.banner;
    case "game":
      return (item.source as VideoGame).banner;
    case "movie":
      return (item.source as Movie).banner;
    case "book":
      // The column is new to the sheet, and a book the sheet has not reached yet has no picture
      // to stand on a wall — the same absence a game without a banner already answers.
      return (item.source as Book).banner || undefined;
  }
};

/**
 * What the item is called on a card: a season says which season it is, because a strip of six
 * cards all reading the same show name says nothing about what was watched.
 */
export const omniTitle = (item: OmniItem): string => {
  switch (item.medium) {
    case "show":
      return `${item.name} S${(item.source as Season).s}`;
    case "game":
    case "movie":
    case "book":
      return item.name;
  }
};

/**
 * What was finished most recently, newest first.
 *
 * Only what has actually closed: an item with no close date is still being played or watched, and
 * listing it under "recently finished" says something false. That also leaves every entry with a
 * date to sort by, where `sortByKey` would otherwise head the list with the undated ones — it puts
 * falsy values first in both directions.
 */
export const recentlyFinished = (items: OmniItem[]): OmniItem[] =>
  items.filter((item) => item.closeDate).sortByKey("closeDate");

/** Items of one medium, which is how every per-medium figure on the page is scoped. */
export const ofMedium = (items: OmniItem[], medium: Medium) => items.filter((item) => item.medium === medium);

/**
 * What each medium is currently on, by the election its own tab already makes: the game in
 * progress, the show the sheet's Last Watched column marks as current, the film watched most
 * recently and the book in hand. Nothing is invented here — a medium with no honest answer
 * contributes none, and the band renders the cards it was given.
 *
 * `visible` decides which media are asked at all, so a medium switched off in the filter drawer
 * cannot headline the page it has been removed from.
 */
export const electNow = (library: Library, visible: Record<Medium, boolean>) => ({
  game: visible.game ? currentlyPlaying(library.games)[0] : undefined,
  show: visible.show ? heroSeason(currentlyWatching(library.shows)) : undefined,
  movie: visible.movie ? latestWatched(library.movies) : undefined,
  book: visible.book ? currentlyReading(library.books)[0] : undefined,
});

/** Whether the Now band has anything to say — the same test the rail's chip is built from. */
export const hasNow = (now: ReturnType<typeof electNow>) => media.some((medium) => now[medium] !== undefined);

/**
 * The first year the union holds anything in, which is the floor the year select offers: the four
 * sheets start in different years, and the union's floor is whichever of them starts first.
 */
export const earliestYear = (items: OmniItem[]): YearNumber => earliestYearOf(items, (item) => item.year);
