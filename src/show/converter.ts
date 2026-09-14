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

      // Rejected rather than counted as zero: a NaN would propagate through the show's episode
      // total and every statistic derived from it, and a zero lies in every sum.
      const e = parseInt(row.Episodes);
      if (Number.isNaN(e)) sheetError(`${where}, Episodes`, `"${row.Episodes}" is not a number`);

      const length = parseInt(row["Episode Length (min)"]);
      // A blank cell and an unreadable one are one case: no runtime, so `undefined` on the model
      // rather than the `NaN` a garbled cell parses to, which the type does not admit.
      // An open season the sheet has no length for yet is the common case, so it is not reported:
      // its episodes count for 0 minutes until the cell is filled.
      const episodeLength = Number.isNaN(length) ? undefined : length;

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

      show.s!.push(season);
      if (endDate && startDate > endDate) sheetError(where, `starts ${startDate} but ends ${endDate}`);
    }

    return show;
  }, {} as Partial<Show>);

  showData.forEach((show) => {
    if (show.s.length === 0) {
      sheetError(`Show "${show.name}"`, "has no seasons, so there is nothing to summarise");
    }

    show.startDate = show.s[0].startDate;
    show.endDate = show.s.at(-1)?.endDate;
    show.e = show.s.sum("e");
    show.minutes = show.s.sum("minutes");
    if (show.endDate && show.startDate > show.endDate) {
      sheetError(`Show "${show.name}"`, `starts ${show.startDate} but ends ${show.endDate}`);
    }
  });

  return showData;
};

/**
 * Bump the version on any change to the model's shape, or a returning visitor's cache lacks the
 * field. The replacer/reviver pair travels with it: a cache written without the parent pointers is
 * only readable by the reviver that puts them back.
 */
export const showDataConfig: DataConfig<Show> = {
  storageKey: dataCacheKey("show", 6),
  converter: jsonConverter,
  reviver: reviveSeasonParents,
  replacer: dropSeasonParents,
};
