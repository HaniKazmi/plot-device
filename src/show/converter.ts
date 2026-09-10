import { dataCacheKey, type DataConfig } from "../common/useData.ts";
import { readCertificate, readChecked, readFullDate, readGenre, sheetError, sheetRow } from "../common/sheetError.ts";
import { splitCell } from "../utils/stringUtils";
import { type Season, type Show, type Status } from "./types";

/**
 * The sheet's own two values, lower case, checked here alone: the model carries the answer as a
 * boolean, so this vocabulary is what a mistyped cell is rejected against and nothing more.
 */
const TYPES = ["show", "anime"] as const;

/**
 * Reads the show/anime cell. Guest mode hides anime (`filters.ts`), so a value that fails to say so
 * is a hidden show on screen rather than a wrong figure — the one cell here whose misreading costs
 * more than a chart, and the same reading the Movies sheet's own `Type` column carries.
 */
const readType = readChecked(TYPES, "a show type");
import "../utils/arrayUtils";

// Season.show is a back-reference to its parent, so it has to be dropped before serialising
// — otherwise JSON.stringify recurses forever — and re-attached after parsing.
export const dropSeasonParents = (key: string, value: unknown) => (key === "show" ? undefined : value);
export const reviveSeasonParents = (shows: Show[]) => shows.forEach((show) => show.s.forEach((s) => (s.show = show)));

/** Seasons that started this early are dropped; the data before it is not trustworthy. */
const EARLIEST_SEASON_YEAR = 2005;

const describeSeason = (row: Record<string, string>, show: Partial<Show>, index: number) =>
  `Row ${sheetRow(index)}, season ${row.Season || "?"} of "${show.name ?? "?"}"`;

export const jsonConverter = (json: Record<string, string>[]) => {
  const showData: Show[] = [];
  json.reduce((show, row, index) => {
    // An absent key is `undefined`, which is `!== ""` — so a truncated row would read as a show
    // row and swallow the seasons below it. `Title` is column A, which is why that cannot happen:
    // the API ends a row at its last filled cell, never before its first.
    if (row.Title !== "") {
      show = {
        name: row.Title,
        status: row.Status as Status,
        anime: readType(row.Type, `Row ${sheetRow(index)}, "${row.Title}", Type`) === "anime",
        genre: readGenre(row.Genre, `Row ${sheetRow(index)}, "${row.Title}", Genre`),
        // A show with none carries an empty string, `Other Genres` sitting well before the last
        // column; `splitCell` answers `[]` to that and to an absent key alike.
        otherGenres: splitCell(row["Other Genres"]),
        network: row.Network,
        certificate: readCertificate(row.Certificate, `Row ${sheetRow(index)}, "${row.Title}", Certificate`),
        franchise: row.Franchise,
        artwork: row.Artwork ?? "",
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
      const startDate = readFullDate(row["Start Date"], `${where}, Start Date`);
      const endDate = row["End Date"] ? readFullDate(row["End Date"], `${where}, End Date`) : undefined;

      const episodes = parseInt(row.Episodes);
      if (Number.isNaN(episodes)) {
        // Counted as zero rather than left as NaN, which would propagate through the show's
        // episode total and every statistic derived from it, blanking numbers far from here.
        console.error(`${where}: episode count "${row.Episodes}" is not a number, counting it as 0`);
      }

      const e = Number.isNaN(episodes) ? 0 : episodes;

      const length = parseInt(row["Episode Length (min)"]);
      // A blank cell and an unreadable one are one case: no runtime, so `undefined` on the model
      // rather than the `NaN` a garbled cell parses to, which the type does not admit.
      const episodeLength = Number.isNaN(length) ? undefined : length;
      if (episodeLength === undefined && e > 0) {
        // Reported for the same reason a bad episode count is: the season's minutes are then 0,
        // and every hours figure on the tab and the union is short by its episodes with nothing
        // on screen saying so — an open season a runtime has not been entered for yet is the
        // common case.
        console.error(`${where}: no episode length, counting its ${e} episodes as 0 minutes`);
      }

      // One column carries two facts by row kind: the season count on a show row, and on a
      // season row the date an episode was last watched. Only the season half is read here, the
      // show half being what `show.s.length` already answers.
      //
      // A finished season is dated by its own end — the day the finale was watched — so the field
      // answers "when was this season last watched" whatever state the season is in, and the hero
      // needs no second rule for a season that has closed. The end date taking precedence is also
      // what keeps a cell the sheet left behind on a finished row, which nobody clears, from
      // electing an old watch as the current one.
      const watched = row["Seasons / Last Watched"];
      const lastWatchedDate =
        endDate ?? (watched ? readFullDate(watched, `${where}, Seasons / Last Watched`) : undefined);

      const season: Season = {
        s: parseFloat(row.Season),
        e,
        // The column is blank for most seasons and padded on a few, so it is normalised here
        // rather than at each reader — and `undefined` is what the type has always claimed.
        subtitle: row.Subtitle.trim() || undefined,
        startDate,
        endDate,
        episodeLength,
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
 * v4: a cached object written before this holds its picture under `banner`, so every card on
 * every surface draws the stand-in instead.
 * v5: a cached object written before this dates only the season in progress, so every finished
 * season carries no last watch and the hero elects among the handful the sheet's column marks.
 * v6: a cached object written before this carries `type` and no `anime`, so every show reads as
 * not anime — guest mode and the toggle stop hiding anything, and the anime split draws one bar.
 */
export const showDataConfig: DataConfig<Show> = {
  storageKey: dataCacheKey("show", 6),
  converter: jsonConverter,
  reviver: reviveSeasonParents,
  replacer: dropSeasonParents,
};
