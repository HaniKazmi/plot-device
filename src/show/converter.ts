import { PlainDate, YearMonthDay, type YearNumber } from "../common/date.ts";
import { dataCacheKey, type DataConfig } from "../common/useData.ts";
import { describing, readAgeRating, readFullDate, readGenre, sheetError, sheetRow } from "../common/sheetError.ts";
import { splitCell } from "../utils/stringUtils";
import type { Season, Show, Status, Type } from "./types";
import "../utils/arrayUtils";

// Season.show is a back-reference to its parent, so it has to be dropped before serialising
// — otherwise JSON.stringify recurses forever — and re-attached after parsing.
export const dropSeasonParents = (key: string, value: unknown) => (key === "show" ? undefined : value);
export const reviveSeasonParents = (shows: Show[]) => shows.forEach((show) => show.s.forEach((s) => (s.show = show)));

/** Seasons that started this early are dropped; the data before it is not trustworthy. */
const EARLIEST_SEASON_YEAR = 2005;

/** The first year a season can actually survive the converter, and so the floor the year select offers. */
export const EARLIEST_SHOW_YEAR = (EARLIEST_SEASON_YEAR + 1) as YearNumber;

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
        genre: readGenre(row.Genre, `Row ${sheetRow(index)}, "${row.Show}", Genre`),
        // Genres is the sheet's last column, and the API ends a row at its final filled cell, so
        // a show without it arrives with no key at all rather than an empty string.
        genres: splitCell(row.Genres),
        network: row.Network,
        rating: readAgeRating(row.Rating, `Row ${sheetRow(index)}, "${row.Show}", Rating`),
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

      // No pair check beside these: `readFullDate` rejects a bare year on either end, so the two
      // can only ever agree. Games needs one because both of its precisions are legal there.
      const startDate = readFullDate(row.Start, `${where}, Start`);
      const endDate = row.End ? readFullDate(row.End, `${where}, End`) : undefined;

      const episodes = parseInt(row.Episode);
      if (Number.isNaN(episodes)) {
        // Counted as zero rather than left as NaN, which would propagate through the show's
        // episode total and every statistic derived from it, blanking numbers far from here.
        console.error(`${where}: episode count "${row.Episode}" is not a number, counting it as 0`);
      }

      const episodeLength = row.Episodes ? parseInt(row.Episodes) : undefined;
      const e = Number.isNaN(episodes) ? 0 : episodes;

      // A season row reuses the Status column for when an episode was last watched — the cell is
      // otherwise always blank, since status is a show-row fact. Read only while the season has
      // no end date: the sheet maintains the cell for the season in progress, and honouring it on
      // a finished season would let a value nobody clears elect an old watch as the current one.
      const lastWatchedDate =
        row.Status && !endDate
          ? describing(`${where}, Status (last watched)`, () => PlainDate.from(row.Status) as YearMonthDay)
          : undefined;

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
        lastWatchedDate,
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
    // The latest any season records, not the last season's: a stale value on an old row must not
    // beat a fresh one, wherever the sheet happens to carry it.
    show.lastWatchedDate = show.s.reduce<YearMonthDay | undefined>(
      (latest, season) =>
        season.lastWatchedDate && (!latest || latest.lte(season.lastWatchedDate)) ? season.lastWatchedDate : latest,
      undefined,
    );
    if (show.endDate && show.startDate > show.endDate) {
      console.error(`Show "${show.name}": starts ${show.startDate} but ends ${show.endDate}`);
    }
  });

  return showData;
};

/**
 * The cache this converter's output is read back from, shared by the Shows tab and by Omnibus.
 * The replacer/reviver pair travels with it: a cache written without the parent pointers is only
 * readable by the reviver that puts them back, and neither half means anything alone.
 *
 * v3: a cached object written before `lastWatchedDate` carries none, and no hero is ever elected.
 */
export const showDataConfig: DataConfig<Show> = {
  storageKey: dataCacheKey("show", 3),
  converter: jsonConverter,
  reviver: reviveSeasonParents,
  replacer: dropSeasonParents,
};
