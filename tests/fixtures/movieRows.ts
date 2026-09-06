/**
 * A raw sheet row as `arrayToJson` hands it over: every value a string, in the Movies tab's own
 * column order.
 *
 * `Format` and `Type` are worded rather than flags, so every row states both readings and neither
 * has a blank case. Unlike the Shows sheet this one has no trailing optional columns before
 * `Artwork` — every row runs the full width — so a missing value is an empty string and never an
 * absent key.
 */
export const movieRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Title: "Arrival",
  Series: "",
  "Series #": "",
  Franchise: "Arrival",
  Director: "Denis Villeneuve",
  Genre: "Sci-Fi",
  "Other Genres": "Drama, Mystery",
  Certificate: "12",
  Format: "Cinema",
  "Release Date": "2016-11-11",
  "Watch Date": "2017-01-14",
  "Runtime (min)": "116",
  Score: "9",
  Type: "film",
  Artwork: "arrival.jpg",
  ...overrides,
});
