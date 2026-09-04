import { CURRENT_YEAR, Year, YearMonthDay } from "../common/date";
import { buildStrip, type StripBand, type StripSpan } from "../common/timelineStripData";
import { namesTheSameThing } from "../utils/stringUtils";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Season } from "../show/types";
import type { VideoGame } from "../vg/types";
import type { OmniItem } from "./adapter";
import { media, type Medium } from "./types";
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
 * The span an item occupies. `medium` is the discriminant, because `source` is a union of four
 * records TypeScript cannot narrow on shape and the item already says which one it holds.
 *
 * A film is a point: `start === end`, which `buildStrip` floors to its minimum band width, and
 * films seen days apart tile clear of one another inside a lane rather than stacking. A book is
 * a span the converter holds to full dates at both ends, so it is always precise.
 */
export const crossingSpan = (item: OmniItem, key: string, today: YearMonthDay): CrossingSpan => {
  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return {
        key,
        start: game.startDate.firstDay(),
        // Still being played, whatever precision the start carries.
        end: game.endDate ? game.endDate.lastDay() : today,
        item,
        // A bare year spans the whole of that year here rather than being shared out the way a
        // game card's own strip does: that estimate needs the whole games library to divide a year
        // between, and a franchise lane holds two or three of its entries. The honest answer at
        // this scale is the year itself, drawn with `imprecise` edges so it does not read as one.
        precise: !(game.startDate instanceof Year) && !(game.endDate instanceof Year),
      };
    }
    case "show": {
      const season = item.source as Season;
      return { key, start: season.startDate, end: season.endDate ?? today, item, precise: true };
    }
    case "movie": {
      const movie = item.source as Movie;
      return { key, start: movie.startDate, end: movie.startDate, item, precise: true };
    }
    case "book": {
      const book = item.source as Book;
      return { key, start: book.startDate, end: book.endDate ?? today, item, precise: true };
    }
  }
};

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
 * `namesTheSameThing` therefore drops a whole group rather than an entry: a franchise where *every*
 * entry repeats the franchise name is a work naming itself rather than a series, and holds no
 * structure for a lane to draw. It is the one test a group has to pass and it is what carries the
 * section — the 588 franchise values the first three sheets hold between them are 169 series by it. What
 * it costs is the lone adaptation, a film and a game under one name, which nothing the sheets
 * record tells apart from a title that happens to appear twice.
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
    .filter(([franchise, group]) => group.some((item) => !namesTheSameThing(franchise, item.name)))
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
