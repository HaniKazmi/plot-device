import { PlainDate } from "../common/date.ts";
import { describing, sheetRow } from "../common/sheetError.ts";
import type { Company, Format, Platform, Status, VideoGame } from "./types";

export const jsonConverter = (json: Record<string, string>[]) => {
  return json.map((row, index) => {
    const where = `Row ${sheetRow(index)}, "${row.Game || "?"}"`;

    const startDate = describing(`${where}, Start Date`, () => PlainDate.from(row["Start Date"]));
    const endDate = row["End Date"]
      ? describing(`${where}, End Date`, () => PlainDate.from(row["End Date"]))
      : undefined;
    const releaseDate = describing(`${where}, Release`, () => PlainDate.from(row.Release));

    // Throws when the pair is inverted, which is the point — but say which pair.
    const numDays = describing(`${where}, played ${startDate} to ${endDate}`, () => startDate.daysTo(endDate));

    const party = row.Status === "Party";
    const status = party ? "Endless" : (row.Status as Status);

    return {
      name: row.Game,
      platform: row.Platform as Platform,
      company: row.Platform.split(" ")[0] as Company,
      franchise: row.Franchise,
      genre: row.Genre,
      theme: row.Theme.split("\n"),
      format: row.Format as Format,
      developer: row.Developer,
      publisher: row.Publisher,
      rating: row.Rating,
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
