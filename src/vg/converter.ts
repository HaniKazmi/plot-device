import { PlainDate } from "../common/date.ts";
import { dataCacheKey, type DataConfig } from "../common/useData.ts";
import { describing, readAgeRating, readDatePair, readGenre, sheetError, sheetRow } from "../common/sheetError.ts";
import { isGameplay, type Company, type Format, type Platform, type Status, type VideoGame } from "./types";

export const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row, index) => {
    const where = `Row ${sheetRow(index)}, "${row.Game || "?"}"`;

    // Read before the date columns, which sit to its right in the sheet. A row nobody has finished
    // is missing every cell from here on, and "no genre recorded" says that, where the first date
    // parsed reports an unparseable cell instead — true, but a narrower answer to a wider question.
    // The same ordering the Movies converter keeps, and for the same reason.
    const genre = readGenre(row.Genre, `${where}, Genre`);

    const startDate = describing(`${where}, Start Date`, () => PlainDate.from(row["Start Date"]));
    const endDate = row["End Date"]
      ? describing(`${where}, End Date`, () => PlainDate.from(row["End Date"]))
      : undefined;
    const releaseDate = describing(`${where}, Release`, () => PlainDate.from(row.Release));

    readDatePair(startDate, endDate, `${where}, played ${startDate} to ${endDate}`);

    // Throws when the pair is inverted, which is the point — but say which pair.
    const numDays = describing(`${where}, played ${startDate} to ${endDate}`, () => startDate.daysTo(endDate));

    const party = row.Status === "Party";
    const status = party ? "Endless" : (row.Status as Status);

    return {
      name: row.Game,
      platform: row.Platform as Platform,
      company: row.Platform.split(" ")[0] as Company,
      franchise: row.Franchise,
      genre,
      // Checked rather than cast: a blank or misspelt cell is a sheet error, and the row is only
      // nameable here. Cast unchecked it reaches `gameplayToColour`, whose neutral fallback makes
      // it look like a style awaiting a colour rather than a cell awaiting a value.
      gameplay: isGameplay(row.Gameplay)
        ? row.Gameplay
        : sheetError(`${where}, Gameplay`, `"${row.Gameplay ?? ""}" is not a gameplay style`),
      theme: row.Theme.split("\n"),
      format: row.Format as Format,
      developer: row.Developer,
      publisher: row.Publisher,
      rating: readAgeRating(row.Rating, `${where}, Rating`),
      status: status,
      party: party,
      startDate: startDate,
      endDate: endDate,
      releaseDate: releaseDate,
      hours: row.Hours ? parseInt(row.Hours) : undefined,
      numDays: numDays,
      banner: row.Banner,
    } as VideoGame;
  });
};

/**
 * The cache this converter's output is read back from, shared by the Games tab and by Omnibus so
 * a version bump cannot land at one of them alone.
 *
 * v2: a cached object written before this carries the *gameplay* vocabulary under `genre` and no
 * `gameplay` at all, so every genre surface would colour a gameplay value against the shared ramp.
 */
export const vgDataConfig: DataConfig<VideoGame> = {
  storageKey: dataCacheKey("vg", 2),
  converter: jsonConverter,
};
