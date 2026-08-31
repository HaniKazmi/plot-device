import type { YearMonthDay } from "../common/date";
import type { StripSpan } from "../common/timelineStripData";
import type { Season, Show } from "./types";
import "../utils/arrayUtils";

export interface SeasonSpan extends StripSpan {
  season: Season;
}

/**
 * The strip key carries the show's name as well as the season number, because a franchise strip
 * draws several shows' seasons side by side and every one of them has an S1.
 */
export const spanKey = (season: Season) => `${season.show.name}-S${season.s}`;

/**
 * Every season of every show given, as spans for `buildStrip`. A season still being watched runs
 * to `today`, which is what an open bar on the full timeline means too.
 */
export const seasonSpans = (shows: Show[], today: YearMonthDay): SeasonSpan[] =>
  shows
    .flatMap((show) => show.s)
    .map((season) => ({
      key: spanKey(season),
      start: season.startDate,
      end: season.endDate ?? today,
      season,
    }));
