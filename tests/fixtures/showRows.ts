/**
 * Raw rows as `arrayToJson` hands them over: every column present, every value a string.
 *
 * The sheet is flat and order-dependent — a non-empty `Show` cell opens a show and every row
 * after it with an empty `Show` cell is one of its seasons. Note the two similarly named
 * columns: `Episode` is the episode count, `Episodes` is the runtime of one episode.
 */
export const showRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Show: "Severance",
  Status: "Watching",
  Anime: "FALSE",
  Banner: "severance.jpg",
  Season: "",
  Episode: "",
  Subtitle: "",
  Start: "",
  End: "",
  Episodes: "",
  ...overrides,
});

export const seasonRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Show: "",
  Status: "",
  Anime: "",
  Banner: "",
  Season: "1",
  Episode: "9",
  Subtitle: "",
  Start: "2022-02-18",
  End: "2022-04-08",
  Episodes: "45",
  ...overrides,
});
