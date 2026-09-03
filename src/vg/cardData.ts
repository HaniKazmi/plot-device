import { Year, YearMonthDay, formatDate, formatDateRange } from "../common/date";
import type { StripSpan } from "../common/timelineStripData";
import type { LedgerRow, PanelSubtitlePart } from "../common/Card";
import { franchiseToColour, genreToColour, type Scheme } from "../utils/types";
import { companyToAccent, gameplayToColour, ratingToColour, type VideoGame } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

interface GameSpan extends StripSpan {
  game: VideoGame;
  /** False when the sheet recorded a year and no month, and the span below is an estimate. */
  precise: boolean;
}

/**
 * What makes one span distinct. Name and platform alone collide on a replay, which would stack two
 * bands under one key — and a card comparing itself against its franchise needs the same answer
 * without running the estimate below to get it.
 */
export const spanKey = (game: VideoGame) => `${game.name}-${game.platform}-${game.startDate}`;

/**
 * The same tuple under the medium's name, which is what identifies a game among the union of the
 * four libraries: the key a franchise strip finds the card's own game by, and the one the Omnibus
 * keys the game's row on, so the two cannot come to disagree.
 */
export const gameKey = (game: VideoGame) => `game-${spanKey(game)}`;

/**
 * The span each game occupies on a card's strip.
 *
 * Half the collection predates the habit of logging days and carries a bare year, so what to do
 * with those is not an edge case. Placing them all on 1 January would be two inventions at once —
 * a month the sheet does not have, and a duration to go with it — and would stack every entry of
 * a year on one spot, where all but the topmost is hidden and unhoverable.
 *
 * Instead the games naming a year share that year out between them, in release order. Two facts
 * make that defensible rather than decorative. A game cannot be played before it exists, so a
 * release date inside the year is a hard floor on where its span can begin — true of 89 of the
 * 171 undated games, and worth about half a year each. And release order does predict the order
 * games were started: measured against the entries that do carry days, it gets a within-year pair
 * right 60% of the time, which is modest but well clear of chance.
 *
 * The estimate is only ever within the right year, and `precise` is what tells the strip to draw
 * these differently, so a position is not read as a date the sheet never held.
 */
export const gameSpans = (games: VideoGame[], today: YearMonthDay): GameSpan[] => {
  const estimated = estimateUndatedSpans(games);

  return games.map((game) => {
    const slot = estimated.get(game);
    const start = slot?.start ?? game.startDate.firstDay();

    return {
      key: spanKey(game),
      start,
      // A game with no end date is still being played, whatever precision its start carries.
      end: game.endDate ? (slot?.end ?? game.endDate.lastDay()) : today,
      game,
      precise: !slot,
    };
  });
};

/** Every day of a year, built once: the array is the same on each call and its dates are interned. */
const daysOfYear = new Map<number, YearMonthDay[]>();

/**
 * Shares each year out between the games that name it and nothing more precise.
 *
 * Sorting by release date is what makes a single left-to-right pass enough: the floors are then
 * non-decreasing, so a game's release can push its span later but never back over one already
 * placed. Each game takes an even share of whatever is left, so the group ends up filling its
 * year exactly however late the first release falls.
 */
const estimateUndatedSpans = (games: VideoGame[]) => {
  const byYear = new Map<number, VideoGame[]>();
  games.forEach((game) => {
    if (game.startDate instanceof Year) byYear.setIfAbsent(game.startDate.year, []).push(game);
  });

  const spans = new Map<VideoGame, { start: YearMonthDay; end: YearMonthDay }>();

  byYear.forEach((group, year) => {
    let days = daysOfYear.get(year);
    if (!days) {
      days = Year.get(year).firstDay().iterateToDate(Year.get(year).lastDay());
      daysOfYear.set(year, days);
    }
    const ordered = group.sortByKey("releaseDate", true);
    let cursor = 0;

    ordered.forEach((game, index) => {
      // How far into its year a release falls, which is only answerable from a full date: a game
      // released in the year it was played, recorded as the bare year, could have come out on any
      // day of it, so the whole year is open. Asking `daysTo` anyway throws, because a January 1st
      // stringifies longer than the year it sits in and its ordering guard reads that as inverted.
      //
      // Clamped because a sheet can carry a release date later than the year it says the game was
      // played, which is a contradiction the strip should survive rather than adjudicate.
      const floor =
        game.releaseDate instanceof YearMonthDay && game.releaseDate.year === year
          ? Math.min(days.length - 1, days[0].daysTo(game.releaseDate)! - 1)
          : 0;
      // Clamped for the same reason the floor is: a group that fills its year exactly leaves the
      // cursor one day past the end of it, and the day a span opens on has to be a day that exists.
      const start = Math.min(days.length - 1, Math.max(cursor, floor));
      const width = Math.max(1, Math.floor((days.length - start) / (ordered.length - index)));
      const end = Math.min(days.length - 1, start + width - 1);

      spans.set(game, { start: days[start], end: days[end] });
      cursor = end + 1;
    });
  });

  return spans;
};

/**
 * How a game is named wherever it is promoted: where it was played, then the two vocabularies the
 * sheet records it under, each wearing the swatch its own ledger row and charts wear.
 *
 * Shared rather than assembled at each site, so the hero and the hover card cannot come to name one
 * game two ways. The Omnibus states its own two parts instead, because a Now card there names the
 * medium where this names the platform.
 */
export const gameSubtitle = (game: VideoGame, scheme: Scheme): PanelSubtitlePart[] => [
  { text: game.platform },
  { text: game.gameplay, swatch: gameplayToColour(game, scheme) },
  { text: game.genre, swatch: genreToColour(game.genre, scheme) },
];

/**
 * The facts a ledger line carries, joined only where the sheet holds them. A blank part joined
 * unconditionally leaves the separator behind it — "12 May 2019 · " — which reads as a value that
 * failed to load rather than as one the sheet never had.
 */
const joinParts = (parts: (string | undefined)[]): string => parts.filter(Boolean).join(" · ");

/**
 * Everything else the sheet records, one fact per line, with related facts on the same line: a
 * release is a date and a format, and a game is made by a developer for a publisher.
 *
 * A swatch appears only where the colour is one the app already speaks — the platform's brand
 * accent is the badge in this card's own corner, and franchise, gameplay, genre and rating each
 * fill a ring or a bar on the tab behind it. The rest are text, because inventing a colour for a
 * publisher teaches the reader a legend no chart honours.
 */
export const gameRows = (game: VideoGame, scheme: Scheme): LedgerRow[] => {
  const rows: LedgerRow[] = [
    { label: "Played", value: formatDateRange(game.startDate, game.endDate) },
    // The brand hex rather than the chart fill, on the same rule the corner chip follows: this is
    // a badge at a badge's size, not a value being compared against its neighbours.
    { label: "Platform", value: game.platform, swatch: companyToAccent(game) },
    { label: "Released", value: joinParts([formatDate(game.releaseDate), game.format]) },
  ];

  // One name where the studio published itself, rather than the same word twice.
  const by = joinParts([...new Set([game.developer, game.publisher])]);
  if (by) rows.push({ label: "By", value: by });

  if (game.franchise) {
    // Unknown franchises fall through to an empty colour, which is no swatch rather than a black
    // square standing for nothing.
    rows.push({ label: "Franchise", value: game.franchise, swatch: franchiseToColour(game, scheme) || undefined });
  }

  // Pushed together because the pair is the point: how it is played, then what it is about.
  rows.push(
    { label: "Gameplay", value: game.gameplay, swatch: gameplayToColour(game, scheme) },
    { label: "Genre", value: game.genre, swatch: genreToColour(game.genre, scheme) },
  );

  // Themes get a line of their own rather than riding on either of the two above: they are the one
  // vocabulary here no chart on the tab colours, so a swatch would name a legend that does not
  // exist — and half of them read as genres, which would make the Gameplay line say two things.
  const themes = joinParts(game.theme);
  if (themes) rows.push({ label: "Themes", value: themes });

  rows.push({ label: "PEGI", value: game.rating, swatch: ratingToColour(game, scheme) });

  return rows;
};

/** The two facts the hero leads with beside its strip: the rest of the ledger waits in the card. */
const HERO_ROW_LABELS = ["Released", "By"];

export const gameHeroRows = (game: VideoGame, scheme: Scheme): LedgerRow[] =>
  gameRows(game, scheme).filter((row) => HERO_ROW_LABELS.includes(row.label));
