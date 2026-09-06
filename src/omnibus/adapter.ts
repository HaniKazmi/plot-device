import type { MediumLazy, OmniItem } from "../common/medium";
import { omniHours, type Library } from "../app/library";
import { moduleOf } from "../app/media";
import { media, type Medium } from "../app/types";
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

/** What the band leads with, by medium; a medium with nothing in flight is absent rather than held. */
export type NowElection = Partial<Record<Medium, unknown>>;

/**
 * What each medium is currently on, each by the election its own tab already makes: the game in
 * progress, the season the sheet's Last Watched column marks as current, the film watched most
 * recently and the book in hand. Nothing is invented here — the walk asks and the band renders the
 * cards it was given, so a card cannot disagree with the hero its home tab shows.
 *
 * The registry arrives as a parameter rather than being imported: the elections live behind the
 * chunk that draws the cards, and naming it here would put four `CardMediaImage`s in this pure
 * module — the arrangement `franchiseUnionData.ts` takes its hover cards by, for the same reason.
 *
 * `visible` decides which media are asked at all, so a medium switched off in this page's own
 * filters cannot headline the page it has been removed from. The item comes back erased, as
 * everything held by medium rather than by record does: the module drawing it is looked up by the
 * same key it was elected under.
 */
export const electNow = (
  lazy: Record<Medium, MediumLazy<unknown>>,
  library: Library,
  visible: Record<Medium, boolean>,
): NowElection => {
  const now: NowElection = {};

  for (const medium of media) {
    if (visible[medium]) now[medium] = lazy[medium].elect(library[medium]);
  }

  return now;
};

/** Whether the Now band has anything to say — the same test the rail's chip is built from. */
export const hasNow = (now: NowElection) => media.some((medium) => now[medium] !== undefined);
