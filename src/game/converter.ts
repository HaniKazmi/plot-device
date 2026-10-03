import { dataCacheKey, type DataConfig } from "../common/useData.ts";
import {
  describing,
  readCertificate,
  readChecked,
  readFullDate,
  readGenre,
  readStyle,
  sheetError,
  sheetRow,
} from "../common/sheetError.ts";
import { splitCell } from "../utils/stringUtils";
import { GAMEPLAY, STATUSES, platformCompany, type Format, type Platform, type VideoGame } from "./types";

/**
 * Checked rather than cast: a blank or misspelt cell is a sheet error, and the row is only nameable
 * here. Cast unchecked it reaches `gameplayToColour`, whose neutral fallback makes it look like a
 * style awaiting a colour rather than a cell awaiting a value.
 */
const readGameplay = readChecked(GAMEPLAY, "a gameplay style");
const readStatus = readChecked(STATUSES, "a status");

/**
 * Reads the themes cell, which the sheet lists in one cell as the Genres columns do.
 *
 * An absent key is rejected while a blank string is not: 12 of 340 games honestly carry no theme,
 * and every column after `Themes` is one the sheet always fills, so a row can only arrive here
 * without the key if the column itself is missing — this converter naming the header wrongly. That
 * distinction is load-bearing, because `themes.includes("Adult")` is what guest mode hides on, and
 * `splitCell` would answer `[]` to both cases alike: every adult game back on screen, silently.
 */
const readThemes = (value: string | undefined, where: string): string[] =>
  value === undefined ? sheetError(where, "the column is missing") : splitCell(value);

export const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row, index) => {
    const where = `Row ${sheetRow(index)}, "${row.Title || "?"}"`;

    // Read before the date columns, which sit to its right in the sheet. A row nobody has finished
    // is missing every cell from here on, and "no genre recorded" says that, where the first date
    // parsed reports an unparseable cell instead — true, but a narrower answer to a wider question.
    // The same ordering the Movies converter keeps, and for the same reason.
    const genre = readGenre(row.Genre, `${where}, Genre`);

    // Held to full dates, as the other three sheets' dates are: the model places a game on a day
    // scale and counts its days, and a bare year reaching either end would be a bar drawn at a guess.
    const startDate = readFullDate(row["Start Date"], `${where}, Start Date`);
    const endDate = row["End Date"] ? readFullDate(row["End Date"], `${where}, End Date`) : undefined;
    const releaseDate = readFullDate(row["Release Date"], `${where}, Release Date`);

    // Throws when the pair is inverted, which is the point — but say which pair.
    const numDays =
      endDate && describing(`${where}, played ${startDate} to ${endDate}`, () => startDate.daysTo(endDate));

    const seriesNumber = parseFloat(row["Series #"]);

    return {
      name: row.Title,
      platform: row.Platform as Platform,
      company: platformCompany(row.Platform),
      franchise: row.Franchise,
      series: row.Series ?? "",
      seriesNumber: Number.isNaN(seriesNumber) ? undefined : seriesNumber,
      genre,
      gameplay: readGameplay(row.Gameplay, `${where}, Gameplay`),
      themes: readThemes(row.Themes, `${where}, Themes`),
      style: readStyle(row.Style, `${where}, Style`),
      format: row.Format as Format,
      developer: row.Developer,
      publisher: row.Publisher,
      certificate: readCertificate(row.Certificate, `${where}, Certificate`),
      status: readStatus(row.Status, `${where}, Status`),
      startDate: startDate,
      endDate: endDate,
      releaseDate: releaseDate,
      hours: row.Hours ? parseInt(row.Hours) : undefined,
      numDays: numDays,
      artwork: row.Artwork,
    } as VideoGame;
  });
};

/** Bump the version on any change to the model's shape, or a returning visitor's cache lacks the field. */
export const gameDataConfig: DataConfig<VideoGame> = {
  storageKey: dataCacheKey("game", 5),
  converter: jsonConverter,
};
