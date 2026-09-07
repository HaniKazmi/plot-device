import { CURRENT_YEAR, YearMonthDay } from "../common/date";
import { buildStrip, type StripBand, type StripSpan } from "../common/timelineStripData";
import { isSeries } from "../app/galleryData";
import { moduleOf } from "../app/media";
import type { OmniItem } from "../common/medium";
import { media, type Medium } from "../app/types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** One entry of a franchise on the strip, with the item behind it for the hover card. */
interface CrossingSpan extends StripSpan {
  item: OmniItem;
  /** False where the sheet recorded a year and no month, so the band's edges are not dates. */
  precise: boolean;
}

/**
 * A franchise the reader has met, and where each of its entries falls in time.
 *
 * `bands` carry absolute lanes across the whole strip — each medium is packed on its own and then
 * offset past the lanes already spent — so a caller renders one strip and never has to work out
 * where a medium's rows begin. The arithmetic lives here because it is the one thing a renderer
 * could get off by one, and here it can be tested. A franchise held by one medium is one lane by
 * the same arithmetic, not a case of its own.
 */
export interface Crossing {
  franchise: string;
  /** In the page's medium order, so two strips read their lanes top to bottom the same way. */
  media: Medium[];
  entries: number;
  bands: StripBand<CrossingSpan>[];
  laneCount: number;
}

/**
 * The span an item occupies, through the same arithmetic the item's own card strip places it by —
 * so a crossings lane and a franchise bead cannot disagree about when an entry ran.
 *
 * A film is a point: `start === end`, which `buildStrip` floors to its minimum band width, and
 * films seen days apart tile clear of one another inside a lane rather than stacking. A game
 * logged with a bare year is the one imprecise case, drawn with dissolved edges so it does not
 * read as a date.
 */
export const crossingSpan = (item: OmniItem, key: string, today: YearMonthDay): CrossingSpan => ({
  key,
  ...moduleOf(item).span(item.source, today),
  item,
});

/**
 * The franchises the reader has met, biggest first, each on one shared scale.
 *
 * Reaching a second medium is not asked of a franchise. Asking it puts a cliff in the section — a
 * series accrues entries unseen and a single entry in another medium then admits all of them at
 * once — and it hides the largest thing on the page for a reason that says nothing about the
 * series: Doctor Who is thirty seasons that no strip could show while no Doctor Who game had been
 * played. What the lanes say is which media hold a franchise, which is a reading of the strip
 * rather than a condition on drawing it.
 *
 * The raw franchise column is what groups, exactly as `movieFranchise` and `showFranchise` do:
 * those deliberately keep a series' founding entry naming itself — "Dune" sits in the Dune
 * franchise, "Alien" in Alien — because whether a franchise is real is a property of the group.
 * Skipping a self-naming entry instead would drop the first film of nearly every series from a
 * lane its own tab draws it in, which is the one disagreement a page composing three tabs cannot
 * afford.
 *
 * `isSeries` therefore drops a whole group rather than an entry, and it is the one test a group has
 * to pass: it is what carries the section, holding the 636 franchise values the four sheets write
 * between them to the 225 that have a series behind them. The lone adaptation is the exception it
 * makes — a novel and the film of it are two works under one name, which is the crossing this
 * section is for, and eleven of the 225 are drawn on that clause alone. That rule is
 * `app/galleryData.ts`'s, the same one the box's own franchise index reads, so the strips and the
 * values the box finds cannot disagree about what a franchise is.
 *
 * The `epoch` is answered here rather than taken from the caller, and it is the earliest *start*
 * among the entries actually drawn. An item's attribution year is the year it ended, so a scale
 * opened on that would leave every entry begun before it clamped flat against the left edge by
 * `buildStrip` — drawn as a band starting on the epoch, with nothing saying it did not. One scale
 * for every strip on the page, so a franchise that ran for three years and one that ran for twenty
 * are not drawn at the same width.
 */
export const crossings = (items: OmniItem[], today: YearMonthDay): { found: Crossing[]; epoch: YearMonthDay } => {
  const byFranchise = items.reduce((index, item) => {
    if (item.franchise) index.setIfAbsent(item.franchise, []).push(item);
    return index;
  }, new Map<string, OmniItem[]>());

  const groups = [...byFranchise.entries()]
    .filter(([franchise, group]) => isSeries(franchise, group))
    .map(([franchise, group]) => ({ franchise, entries: group.length, lanes: crossingLanes(group, today) }));

  // Floored to the January of that year, because `stripYearTicks` measures its gridlines from the
  // first of the epoch's month and a scale opened mid-month puts every year line off by the
  // difference. No group surviving leaves no strip to draw, so the year is only a value for the
  // ticks the caller does not render.
  const epoch = YearMonthDay.get(earliestStart(groups) ?? CURRENT_YEAR, 1, 1);

  return { found: groups.map((group) => buildCrossing(group, epoch, today)).sortByKey("entries"), epoch };
};

/** One list of spans per medium the group holds, in the page's medium order. */
const crossingLanes = (group: OmniItem[], today: YearMonthDay) =>
  media
    .filter((medium) => group.some((item) => item.medium === medium))
    .map((medium) => ({
      medium,
      spans: group
        .filter((item) => item.medium === medium)
        // The index is what keeps a key unique through a replay or a rewatch, where name, medium
        // and even the dates repeat.
        .map((item, index) => crossingSpan(item, `${medium}-${index}-${item.name}`, today)),
    }));

type CrossingGroup = { franchise: string; entries: number; lanes: ReturnType<typeof crossingLanes> };

/** The year the first of the drawn entries begins in, which is where the shared scale opens. */
const earliestStart = (groups: CrossingGroup[]): number | undefined =>
  groups
    .flatMap((group) => group.lanes.flatMap((lane) => lane.spans))
    .reduce<number | undefined>(
      (earliest, span) => (!earliest || span.start.year < earliest ? span.start.year : earliest),
      undefined,
    );

const buildCrossing = (group: CrossingGroup, epoch: YearMonthDay, today: YearMonthDay): Crossing => {
  const bands: StripBand<CrossingSpan>[] = [];
  let lanesSpent = 0;

  group.lanes.forEach(({ spans }) => {
    const strip = buildStrip(spans, epoch, today);

    bands.push(...strip.bands.map((band) => ({ ...band, lane: band.lane + lanesSpent })));
    // `buildStrip` answers one lane for a medium whose entries all fall outside the scale, so a
    // medium always keeps a row of its own and the lanes below it do not slide up into it.
    lanesSpent += strip.laneCount;
  });

  return {
    franchise: group.franchise,
    media: group.lanes.map((lane) => lane.medium),
    entries: group.entries,
    bands,
    laneCount: lanesSpent,
  };
};

/** How many entries the crossings hold between them — the figure the vitals card states. */
export const crossingEntries = (found: Crossing[]) => found.sum("entries");
