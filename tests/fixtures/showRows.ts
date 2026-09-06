/**
 * Raw rows as `arrayToJson` hands them over: every value a string, in the Shows tab's own column
 * order.
 *
 * The sheet is flat and order-dependent — a non-empty `Title` cell opens a show and every row
 * after it with an empty `Title` cell is one of its seasons. Two columns change meaning by row
 * kind: `Status` is a show's own status and blank on a season, and `Seasons / Last Watched` is the
 * season count on a show row and the date an episode was last watched on an in-progress season.
 *
 * `Artwork` is the sheet's last column, so a row can end before it and carry no key at all.
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
      Title: "Severance",
      Franchise: "Severance",
      Genre: "Sci-Fi",
      "Other Genres": "Drama, Thriller",
      Network: "Apple TV+",
      Certificate: "15",
      Type: "show",
      Status: "Watching",
      Season: "",
      Subtitle: "",
      Episodes: "",
      "Episode Length (min)": "",
      "Start Date": "",
      "End Date": "",
      "Seasons / Last Watched": "",
      Artwork: "severance.jpg",
    },
    overrides,
  );

export const seasonRow = (overrides: Overrides = {}): Record<string, string> =>
  withOverrides(
    {
      Title: "",
      Franchise: "",
      Genre: "",
      "Other Genres": "",
      Network: "",
      Certificate: "",
      Type: "",
      Status: "",
      Season: "1",
      Subtitle: "",
      Episodes: "9",
      "Episode Length (min)": "45",
      "Start Date": "2022-02-18",
      "End Date": "2022-04-08",
      "Seasons / Last Watched": "",
      Artwork: "",
    },
    overrides,
  );
