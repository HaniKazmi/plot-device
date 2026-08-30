import { PlainDate, YearMonthDay } from "../common/date.ts";
import { describing, sheetError, sheetRow } from "../common/sheetError.ts";
import { isAgeRating, type AgeRating } from "../utils/types";
import type { Season, Show, Status, Type } from "./types";
import "../utils/arrayUtils";

// Season.show is a back-reference to its parent, so it has to be dropped before serialising
// — otherwise JSON.stringify recurses forever — and re-attached after parsing.
export const dropSeasonParents = (key: string, value: unknown) => (key === "show" ? undefined : value);
export const reviveSeasonParents = (shows: Show[]) => shows.forEach((show) => show.s.forEach((s) => (s.show = show)));

/** Seasons that started this early are dropped; the data before it is not trustworthy. */
const EARLIEST_SEASON_YEAR = 2005;

/**
 * The secondary genres arrive as one comma-separated cell. Empty parts are dropped so a show with
 * none has an empty list rather than a list holding one empty string, which every reader would
 * otherwise have to filter before counting or rendering it.
 *
 * The cell is the sheet's last column, and the API ends a row at its final filled cell, so a show
 * without it arrives with no key at all rather than an empty string.
 */
const splitGenres = (value: string | undefined) =>
  (value ?? "")
    .split(",")
    .map((genre) => genre.trim())
    .filter(Boolean);

/**
 * Rejects a rating the colour map could not paint, while the row it came from is still known.
 * Left to reach `ageRatingToColour`, a bad cell throws from inside a render instead, naming the
 * value but not the show carrying it.
 */
const readRating = (value: string | undefined, where: string): AgeRating =>
  isAgeRating(value ?? "") ? (value as AgeRating) : sheetError(where, `"${value ?? ""}" is not an age rating`);

const describeSeason = (row: Record<string, string>, show: Partial<Show>, index: number) =>
  `Row ${sheetRow(index)}, season ${row.Season || "?"} of "${show.name ?? "?"}"`;

export const jsonConverter = (json: Record<string, string>[]) => {
  const showData: Show[] = [];
  json.reduce((show, row, index) => {
    if (row.Show !== "") {
      show = {
        name: row.Show,
        status: row.Status as Status,
        type: row.Type as Type,
        genre: row.Genre,
        genres: splitGenres(row.Genres),
        network: row.Network,
        rating: readRating(row.Rating, `Row ${sheetRow(index)}, "${row.Show}", Rating`),
        franchise: row.Franchise,
        banner: row.Banner,
        s: [],
      };
      showData.push(show as Show);
    } else {
      const where = describeSeason(row, show, index);

      if (!show.s) {
        sheetError(where, "this is a season row, but no show has been declared above it");
      }

      const startDate = describing(`${where}, Start`, () => PlainDate.from(row.Start) as YearMonthDay);
      const endDate = row.End ? describing(`${where}, End`, () => PlainDate.from(row.End) as YearMonthDay) : undefined;

      const episodes = parseInt(row.Episode);
      if (Number.isNaN(episodes)) {
        // Counted as zero rather than left as NaN, which would propagate through the show's
        // episode total and every statistic derived from it, blanking numbers far from here.
        console.error(`${where}: episode count "${row.Episode}" is not a number, counting it as 0`);
      }

      const episodeLength = row.Episodes ? parseInt(row.Episodes) : undefined;
      const e = Number.isNaN(episodes) ? 0 : episodes;

      const season: Season = {
        s: parseFloat(row.Season),
        e,
        // The column is blank for most seasons and padded on a few, so it is normalised here
        // rather than at each reader — and `undefined` is what the type has always claimed.
        subtitle: row.Subtitle.trim() || undefined,
        startDate,
        endDate,
        episodeLength: episodeLength as number,
        minutes: episodeLength ? episodeLength * e : 0,
        show: show as Show,
      };

      if (startDate.year > EARLIEST_SEASON_YEAR) {
        show.s!.push(season);
      }
      if (endDate && startDate > endDate) {
        console.error(`${where}: starts ${startDate} but ends ${endDate}`);
      }
    }

    return show;
  }, {} as Partial<Show>);

  showData.forEach((show) => {
    if (show.s.length === 0) {
      sheetError(
        `Show "${show.name}"`,
        `has no seasons starting after ${EARLIEST_SEASON_YEAR}, so there is nothing to summarise`,
      );
    }

    show.startDate = show.s[0].startDate;
    show.endDate = show.s.at(-1)?.endDate;
    show.e = show.s.sum("e");
    show.minutes = show.s.sum("minutes");
    if (show.endDate && show.startDate > show.endDate) {
      console.error(`Show "${show.name}": starts ${show.startDate} but ends ${show.endDate}`);
    }
  });

  return showData;
};
