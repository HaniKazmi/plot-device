import type { YearNumber } from "../common/date";
import type { OmniItem } from "../common/medium";
import { omniHours, type Library } from "../app/library";
import { moduleOf } from "../app/media";
import { media, type Medium } from "../app/types";
import { currentlyReading } from "../books/statsData";
import { latestWatched } from "../movie/statsData";
import { currentlyWatching, heroSeason } from "../show/statsData";
import { currentlyPlaying } from "../vg/statsData";
import { earliestYear as earliestYearOf } from "../common/statsData";
import "../utils/arrayUtils";

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
 * What the item is called on a card: a season says which season it is, because a strip of six
 * cards all reading the same show name says nothing about what was watched.
 */
export const omniTitle = (item: OmniItem): string => moduleOf(item).title(item.source);

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
  game: visible.game ? currentlyPlaying(library.game)[0] : undefined,
  show: visible.show ? heroSeason(currentlyWatching(library.show)) : undefined,
  movie: visible.movie ? latestWatched(library.movie) : undefined,
  book: visible.book ? currentlyReading(library.book)[0] : undefined,
});

/** Whether the Now band has anything to say — the same test the rail's chip is built from. */
export const hasNow = (now: ReturnType<typeof electNow>) => media.some((medium) => now[medium] !== undefined);

/**
 * The first year the union holds anything in, which is the floor the year select offers: the four
 * sheets start in different years, and the union's floor is whichever of them starts first.
 */
export const earliestYear = (items: OmniItem[]): YearNumber => earliestYearOf(items, (item) => item.year);
