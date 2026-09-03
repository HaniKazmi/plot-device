/**
 * A raw sheet row as `arrayToJson` hands it over: every value a string, keyed by the headers the
 * Books sheet actually carries — including the spaces and the parenthesis in `Hours (est.)`.
 *
 * The sheet holds thirty-odd provenance columns beyond these; the converter reads none of them,
 * so the fixture carries only what it reads. `End Date`, `Score` and `# in Series` are the cells
 * a row can honestly leave blank.
 */
export const bookRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  "Book Name": "Chasm City",
  Author: "Alastair Reynolds",
  Franchise: "Revelation Space",
  Series: "Revelation Space",
  "# in Series": "2",
  Genre: "Sci-Fi",
  Status: "Finished",
  Format: "eBook",
  Score: "8",
  "Release Date": "2001-05-01",
  "Start Date": "2026-03-15",
  "End Date": "2026-03-27",
  "Number of Pages": "694",
  "Hours (est.)": "12.4",
  Banner: "https://assets.hardcover.app/external_data/1/chasm-city.jpeg",
  ...overrides,
});
