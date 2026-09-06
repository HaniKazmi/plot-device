/**
 * A raw sheet row as `arrayToJson` hands it over: every value a string, keyed by the headers the
 * Books sheet actually carries.
 *
 * The sheet holds an `ID` beyond these, which the converter reads none of, so the fixture carries
 * only what it reads. `End Date`, `Score` and `Series #` are the cells a row can honestly leave
 * blank.
 */
export const bookRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Title: "Chasm City",
  Author: "Alastair Reynolds",
  Franchise: "Revelation Space",
  Series: "Revelation Space",
  "Series #": "2",
  Genre: "Sci-Fi",
  Status: "Finished",
  Format: "eBook",
  Score: "8",
  "Release Date": "2001-05-01",
  "Start Date": "2026-03-15",
  "End Date": "2026-03-27",
  Pages: "694",
  Hours: "12.4",
  Artwork: "https://assets.hardcover.app/external_data/1/chasm-city.jpeg",
  ...overrides,
});
