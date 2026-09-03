import { formatDateRange, type YearMonthDay } from "../common/date";
import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import type { StripSpan } from "../common/timelineStripData";
import { ageRatingToColour, franchiseToColour, genreToColour, type Scheme } from "../utils/types";
import { namesTheSameThing } from "../utils/stringUtils";
import { networkToColour, type Season, type Show } from "./types";
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
 * The same pair under the medium's name, which is what identifies a season among the union of the
 * four libraries: the key the Omnibus keys the season's row on, and the one a franchise strip
 * draws it under, so the two cannot come to disagree.
 */
export const seasonKey = (season: Season) => `show-${spanKey(season)}`;

/**
 * What a show's card looks for on a franchise strip. The strip's entries are seasons, and the card
 * is the show's, so every season of it answers the show rather than itself.
 */
export const showSubject = (show: Show) => `show-${show.name}`;

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

/**
 * The facts that are not figures.
 *
 * A row carries a swatch exactly where the app speaks that field's colour somewhere else — the
 * rating shares the games tab's map, the genre the vocabulary Movies shares, the network its own
 * table where it has an entry. Status has a colour too and is already a filled tile above, so
 * repeating it here would say it twice.
 */
export const showRows = (show: Show, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Watched", value: formatDateRange(show.startDate, show.endDate) },
    // The latest season's own number, not the array length — the converter drops pre-2006
    // seasons, so a show with early seasons dropped holds fewer entries than its numbering.
    { label: "Last Watched", value: `S${show.s.at(-1)!.s}E${show.s.at(-1)!.e}` },
    // The primary genre leads and the rest follow it, which is the order the sheet holds them in
    // and the order the charts group by.
    { label: "Genre", value: [show.genre, ...show.genres].join(" · "), swatch: genreToColour(show.genre, scheme) },
    { label: "Network", value: show.network, swatch: networkToColour(show, scheme) || undefined },
    { label: "Rating", value: show.rating, swatch: ageRatingToColour(show.rating, scheme) },
  ];

  // The runtime of the most recent season's episodes — where the seasons disagree, the latest is
  // the one a reader deciding whether to start tonight is asking about.
  const episodeLength = show.s.at(-1)!.episodeLength;
  if (episodeLength) rows.push({ label: "Episode", value: `${episodeLength} min` });

  // A show with no wider franchise carries its own name in the column, so the row appears only
  // where it names something the show belongs to rather than the show over again.
  // Unknown franchises fall through to an empty colour, which is no swatch rather than a black
  // one — the table names the couple of dozen the app draws, not every series on the sheet.
  if (!namesTheSameThing(show.franchise, show.name))
    rows.push({ label: "Franchise", value: show.franchise, swatch: franchiseToColour(show, scheme) || undefined });

  return rows;
};

/** The two facts the hero leads with beside its strip: the rest of the ledger waits in the card. */
const HERO_ROW_LABELS = ["Last Watched", "Rating"];

export const showHeroRows = (show: Show, scheme: Scheme): LedgerRow[] =>
  showRows(show, scheme).filter((row) => HERO_ROW_LABELS.includes(row.label));
