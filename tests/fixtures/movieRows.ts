/**
 * A raw sheet row as `arrayToJson` hands it over: every value a string.
 *
 * `Cinema` is written only in the true case and left blank otherwise. Unlike the Shows sheet this
 * one has no trailing optional columns — every row runs the full width — so a missing value is
 * always an empty string here and never an absent key.
 */
export const movieRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Name: "Arrival",
  "Watch Date": "2017-01-14",
  Score: "9",
  Cinema: "TRUE",
  Runtime: "116min",
  Genre: "Sci-Fi",
  Genres: "Drama, Mystery",
  Rating: "12",
  "Release Date": "2016-11-11",
  Franchise: "Arrival",
  Director: "Denis Villeneuve",
  Banner: "arrival.jpg",
  ...overrides,
});
