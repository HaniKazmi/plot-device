/**
 * Raw rows as `arrayToJson` hands them over: every value a string.
 *
 * The sheet is flat and order-dependent — a non-empty `Show` cell opens a show and every row
 * after it with an empty `Show` cell is one of its seasons. Note the two similarly named
 * columns: `Episode` is the episode count, `Episodes` is the runtime of one episode. `Status`
 * changes meaning by row kind: a show's status on show rows, a last-watched date on in-progress
 * season rows.
 *
 * `Genres` is the sheet's last column, so a row can end before it and carry no key at all.
 * Overriding a column to `undefined` drops the key, which is how such a row actually arrives.
 */
type Overrides = Record<string, string | undefined>;

const withOverrides = (base: Record<string, string>, overrides: Overrides): Record<string, string> => {
  const row: Overrides = { ...base, ...overrides };
  Object.keys(row).forEach((key) => row[key] === undefined && delete row[key]);
  return row as Record<string, string>;
};

export const showRow = (overrides: Overrides = {}): Record<string, string> =>
  withOverrides(
    {
      Show: "Severance",
      Status: "Watching",
      Genre: "Sci-Fi",
      Subtitle: "",
      Season: "",
      Episode: "",
      Start: "",
      End: "",
      Episodes: "",
      Length: "",
      Network: "Apple TV+",
      Rating: "15",
      Type: "show",
      Banner: "severance.jpg",
      Franchise: "Severance",
      Genres: "Drama, Thriller",
    },
    overrides,
  );

export const seasonRow = (overrides: Overrides = {}): Record<string, string> =>
  withOverrides(
    {
      Show: "",
      Status: "",
      Genre: "",
      Subtitle: "",
      Season: "1",
      Episode: "9",
      Start: "2022-02-18",
      End: "2022-04-08",
      Episodes: "45",
      Length: "",
      Network: "",
      Rating: "",
      Type: "",
      Banner: "",
      Franchise: "",
      Genres: "",
    },
    overrides,
  );
