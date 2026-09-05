import type { YearNumber } from "../common/date";
import type { OmniItem } from "../common/medium";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Show } from "../show/types";
import type { VideoGame } from "../vg/types";
import { MEDIA, mediaModules } from "../app/media";
import { currentlyReading } from "../books/statsData";
import { latestWatched } from "../movie/statsData";
import { currentlyWatching, heroSeason } from "../show/statsData";
import { currentlyPlaying } from "../vg/statsData";
import { media, type Measure, type Medium } from "./types";
import { earliestYear as earliestYearOf } from "../common/statsData";
import "../utils/arrayUtils";

/**
 * The union's own item, declared in the shared layer because each domain's `module.ts` builds its
 * own arm of the union and a tracked domain may not import the folder composing them. Re-exported
 * here, where the rest of this tab already names it.
 */
export type { OmniItem };

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
        games: library.games.filter(MEDIA.game.guestFilter),
        shows: library.shows.filter(MEDIA.show.guestFilter),
        movies: library.movies.filter(MEDIA.movie.guestFilter),
        books: library.books.filter(MEDIA.book.guestFilter),
      }
    : library;

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
 * `finishedItems` already applies to every domain's library grid.
 */
export const omniBanner = (item: OmniItem): string | undefined => MEDIA[item.medium].banner(item.source);

/**
 * What the item is called on a card: a season says which season it is, because a strip of six
 * cards all reading the same show name says nothing about what was watched.
 */
export const omniTitle = (item: OmniItem): string => MEDIA[item.medium].title(item.source);

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
