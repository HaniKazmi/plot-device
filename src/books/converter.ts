import { dataCacheKey, type DataConfig } from "../common/useData";
import { describing, readFullDate, readGenre, sheetError, sheetRow } from "../common/sheetError";
import { isFormat, isStatus, type Book, type Format, type Status } from "./types";

/**
 * Reads a status cell, rejecting one outside the two words this sheet uses.
 *
 * Checked here rather than cast, because `statusToColour` answers `undefined` off its union and
 * `TotalsBand` then drops the segment without a word — a book with a typo in its status would
 * simply vanish from the status band and from the hero's election.
 */
const readStatus = (value = "", where: string): Status =>
  isStatus(value) ? value : sheetError(where, `"${value}" is not a status`);

/**
 * Reads a format cell. A blank is rejected too: the column is new to the sheet, and a row it has
 * not reached yet is a row nobody finished rather than a book read in no format at all.
 */
const readFormat = (value = "", where: string): Format =>
  isFormat(value) ? value : sheetError(where, `"${value}" is not a format`);

/**
 * Reads a number the model requires. Both figures this reads are measures, so a `NaN` would blank
 * every total taken over the column and a 0 would be a lie in the sum — a book has pages, and the
 * sheet estimates hours for every finished one.
 */
const readNumber = (value: string | undefined, where: string, parse: (value: string) => number): number => {
  const number = parse(value ?? "");
  return Number.isNaN(number) ? sheetError(where, `"${value ?? ""}" is not a number`) : number;
};

export const jsonConverter = (json: Record<string, string>[]): Book[] =>
  json.map((row, index) => {
    const name = row["Book Name"];
    const where = `Row ${sheetRow(index)}, "${name || "?"}"`;
    // Read before the columns below rather than in place among them: a row nobody has finished
    // is missing every cell from here rightwards, and "no genre recorded" says that where the
    // first date to be parsed would report an unparseable cell instead.
    const genre = readGenre(row.Genre, `${where}, Genre`);
    const status = readStatus(row.Status, `${where}, Status`);
    const startDate = readFullDate(row["Start Date"], `${where}, Start Date`);
    const endDate = row["End Date"] ? readFullDate(row["End Date"], `${where}, End Date`) : undefined;
    // The status and the end date have to agree, because the two answer one question in two
    // places: a finished book with no end counts towards no year and stands on no strip, and a
    // book still being read that carries an end is elected as the hero and listed as finished at
    // once, with nothing on screen to say which is true.
    if (status === "Finished" && !endDate) sheetError(`${where}, End Date`, "a finished book has no end date");
    if (status === "Reading" && endDate) sheetError(`${where}, End Date`, "a book still being read has an end date");
    const score = parseInt(row.Score);
    const seriesNumber = parseInt(row["# in Series"]);

    return {
      name,
      author: row.Author ?? "",
      // A standalone book carries its own name, which is what the Games and Movies sheets write
      // for a standalone work: the franchise shells all treat a one-member group as an item naming
      // itself, so a blank would be a third convention for the same fact.
      franchise: row.Franchise || name,
      series: row.Series ?? "",
      seriesNumber: Number.isNaN(seriesNumber) ? undefined : seriesNumber,
      genre,
      status,
      format: readFormat(row.Format, `${where}, Format`),
      // A book nobody scored is left out rather than counted as NaN, which would propagate into
      // any average taken over the column.
      score: Number.isNaN(score) ? undefined : score,
      releaseDate: readFullDate(row["Release Date"], `${where}, Release Date`),
      startDate,
      endDate,
      // Inclusive of both ends, as Games counts a playthrough, so a book begun and finished on one
      // day is one day rather than none — the sheet's own Days Reading column is the difference and
      // reads 0 for that book. `daysTo` throws on a pair the wrong way round, which is a sheet
      // error and so is named as one.
      numDays: endDate && describing(`${where}, End Date`, () => startDate.daysTo(endDate)),
      pages: readNumber(row["Number of Pages"], `${where}, Number of Pages`, parseInt),
      // A book still being read may have no sessions logged yet, and the sheet estimates hours only
      // for finished books — so a blank there is honestly none so far, where on a finished book it
      // is a cell nobody filled.
      hours:
        status === "Reading" && !row["Hours (est.)"]
          ? 0
          : readNumber(row["Hours (est.)"], `${where}, Hours (est.)`, parseFloat),
      banner: row.Banner ?? "",
    };
  });

/**
 * The cache this converter's output is read back from, shared by the Books tab and by Omnibus so
 * a version bump cannot land at one of them alone.
 */
export const bookDataConfig: DataConfig<Book> = {
  storageKey: dataCacheKey("book", 1),
  converter: jsonConverter,
};
