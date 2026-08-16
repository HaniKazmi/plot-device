/** A raw sheet row as `arrayToJson` hands it over: every column present, every value a string. */
export const movieRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Name: "Arrival",
  "Release Date": "2016-11-11",
  "Watch Date": "2017-01-14",
  Rating: "12",
  Score: "9",
  Runtime: "116",
  Genre: "Science Fiction",
  Director: "Denis Villeneuve",
  Banner: "arrival.jpg",
  ...overrides,
});
