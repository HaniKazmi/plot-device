import type { YearMonthDay } from "../common/date";
import type { PanelSubtitlePart } from "../common/Card";
import type { StripSpan } from "../common/timelineStripData";
import { genreToColour, type Scheme } from "../utils/types";
import type { Season, Show } from "./types";
import "../utils/arrayUtils";

interface SeasonSpan extends StripSpan {
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

/**
 * How a show is named wherever it is promoted: the network it's on, then the genre, wearing the
 * swatch its ledger row and every genre wedge on the tab wear.
 *
 * Shared rather than assembled at each site, so the hero, the hover card and the Omnibus's Now
 * card cannot come to name one show two ways.
 */
export const showSubtitle = (show: Show, scheme: Scheme): PanelSubtitlePart[] => [
  { text: show.network },
  { text: show.genre, swatch: genreToColour(show.genre, scheme) },
];
