import { Year, YearMonthDay } from "../common/date";
import type { StripSpan } from "../common/timelineStripData";
import type { VideoGame } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

export interface GameSpan extends StripSpan {
  game: VideoGame;
  /** False when the sheet recorded a year and no month, and the span below is an estimate. */
  precise: boolean;
}

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
      // Name and platform alone collide on a replay, which would stack two bands under one key.
      key: `${game.name}-${game.platform}-${game.startDate}`,
      start,
      // A game with no end date is still being played, whatever precision its start carries.
      end: game.endDate ? (slot?.end ?? game.endDate.lastDay()) : today,
      game,
      precise: !slot,
    };
  });
};

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
    const days = Year.get(year).firstDay().iterateToDate(Year.get(year).lastDay());
    const ordered = group.sortByKey("releaseDate", true);
    let cursor = 0;

    ordered.forEach((game, index) => {
      // Clamped because a sheet can carry a release date later than the year it says the game was
      // played, which is a contradiction the strip should survive rather than adjudicate.
      const floor =
        game.releaseDate.year === year ? Math.min(days.length - 1, days[0].daysTo(game.releaseDate)! - 1) : 0;
      const start = Math.max(cursor, floor);
      const width = Math.max(1, Math.floor((days.length - start) / (ordered.length - index)));
      const end = Math.min(days.length - 1, start + width - 1);

      spans.set(game, { start: days[start], end: days[end] });
      cursor = end + 1;
    });
  });

  return spans;
};

/**
 * Games grouped by franchise, so a card can show the rest of its series.
 *
 * The empty franchise is skipped: it is the sheet's "no series", and grouping on it would hand
 * every unaffiliated game a strip several hundred bands deep.
 */
export const franchiseIndex = (games: VideoGame[]) =>
  games.reduce((index, game) => {
    if (game.franchise) index.setIfAbsent(game.franchise, []).push(game);
    return index;
  }, new Map<string, VideoGame[]>());
