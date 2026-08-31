import { Year, type YearMonthDay } from "../common/date";
import { buildStrip, type StripBand, type StripSpan } from "../common/timelineStripData";
import { namesTheSameThing } from "../utils/stringUtils";
import type { Movie } from "../movie/types";
import type { Season } from "../show/types";
import type { VideoGame } from "../vg/types";
import type { OmniItem } from "./adapter";
import { media, type Medium } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/** One entry of a crossing franchise on the strip, with the item behind it for the hover card. */
export interface CrossingSpan extends StripSpan {
  item: OmniItem;
  /** False where the sheet recorded a year and no month, so the band's edges are not dates. */
  precise: boolean;
}

/**
 * A franchise the reader met in more than one medium, and where each entry falls in time.
 *
 * `bands` carry absolute lanes across the whole strip — each medium is packed on its own and then
 * offset past the lanes already spent — so a caller renders one strip and never has to work out
 * where a medium's rows begin. The arithmetic lives here because it is the one thing a renderer
 * could get off by one, and here it can be tested.
 */
export interface Crossing {
  franchise: string;
  /** In the page's medium order, so two crossings read their lanes top to bottom the same way. */
  media: Medium[];
  entries: number;
  bands: StripBand<CrossingSpan>[];
  laneCount: number;
}

/**
 * The span an item occupies. `medium` is the discriminant, because `source` is a union of three
 * records TypeScript cannot narrow on shape and the item already says which one it holds.
 *
 * A film is a point: `start === end`, which `buildStrip` floors to its minimum band width, and
 * films seen days apart tile clear of one another inside a lane rather than stacking.
 */
const crossingSpan = (item: OmniItem, key: string, today: YearMonthDay): CrossingSpan => {
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
  }
};

/**
 * The franchises spanning more than one medium, biggest first.
 *
 * The raw franchise column is what groups, exactly as `movieFranchise` and `showFranchise` do:
 * those deliberately keep a series' founding entry naming itself — "Dune" sits in the Dune
 * franchise, "Alien" in Alien — because whether a franchise is real is a property of the group.
 * Skipping a self-naming entry instead would drop the first film of nearly every series from a
 * lane its own tab draws it in, which is the one disagreement a page composing three tabs cannot
 * afford.
 *
 * `namesTheSameThing` therefore drops a whole group rather than an entry: a franchise where *every*
 * entry repeats the franchise name has no series structure anywhere in it, and two media meeting
 * there met by sharing a title. What that costs is the single-film-plus-single-game adaptation,
 * which is indistinguishable from the coincidence by anything the sheets record.
 *
 * `epoch` is the union's own first year rather than the group's, so every strip on the page is one
 * scale and two franchises can be read against each other.
 */
export const crossings = (items: OmniItem[], epoch: YearMonthDay, today: YearMonthDay): Crossing[] => {
  const byFranchise = items.reduce((index, item) => {
    if (item.franchise) index.setIfAbsent(item.franchise, []).push(item);
    return index;
  }, new Map<string, OmniItem[]>());

  return [...byFranchise.entries()]
    .filter(
      ([franchise, group]) =>
        new Set(group.map((item) => item.medium)).size > 1 &&
        group.some((item) => !namesTheSameThing(franchise, item.name)),
    )
    .map(([franchise, group]) => buildCrossing(franchise, group, epoch, today))
    .sortByKey("entries");
};

const buildCrossing = (franchise: string, group: OmniItem[], epoch: YearMonthDay, today: YearMonthDay): Crossing => {
  const present = media.filter((medium) => group.some((item) => item.medium === medium));
  const bands: StripBand<CrossingSpan>[] = [];
  let lanesSpent = 0;

  present.forEach((medium) => {
    const spans = group
      .filter((item) => item.medium === medium)
      // The index is what keeps a key unique through a replay or a rewatch, where name, medium and
      // even the dates repeat.
      .map((item, index) => crossingSpan(item, `${medium}-${index}-${item.name}`, today));
    const strip = buildStrip(spans, epoch, today);

    bands.push(...strip.bands.map((band) => ({ ...band, lane: band.lane + lanesSpent })));
    // `buildStrip` answers one lane for a medium whose entries all fall outside the scale, so a
    // medium always keeps a row of its own and the lanes below it do not slide up into it.
    lanesSpent += strip.laneCount;
  });

  return { franchise, media: present, entries: group.length, bands, laneCount: lanesSpent };
};

/** How many entries the crossings hold between them — the figure the vitals card states. */
export const crossingEntries = (found: Crossing[]) => found.sum("entries");
