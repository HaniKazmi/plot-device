import { YearMonthDay } from "../../src/common/date";
import type { VideoGame } from "../../src/game/types";

/**
 * Every platform the app claims to understand, mirroring `platformShortNames` in `game/types.ts`.
 * Adding a console means adding it here too, and the completeness test then fails until it
 * resolves to both a colour and a short name.
 */
export const KNOWN_PLATFORMS = [
  "PlayStation 2",
  "PlayStation 3",
  "PlayStation P",
  "PlayStation 4",
  "PlayStation 5",
  "Nintendo Wii",
  "Nintendo GBC",
  "Nintendo GBA",
  "Nintendo DS",
  "Nintendo 3DS",
  "Nintendo Switch",
  "Nintendo Switch 2",
  "PC",
  "iOS",
  "Xbox 360",
] as const;

/** A complete, valid game. Override only the fields a test is actually about. */
export const videoGame = (overrides: Partial<VideoGame> = {}): VideoGame =>
  ({
    name: "Breath of the Wild",
    platform: "Nintendo Switch",
    company: "Nintendo",
    developer: "Nintendo EPD",
    publisher: "Nintendo",
    franchise: "Zelda",
    series: "",
    genre: "Adventure",
    gameplay: "Action Adventure",
    themes: ["Fantasy"],
    certificate: "12",
    releaseDate: YearMonthDay.get(2017, 3, 3),
    format: "Physical",
    status: "Beat",
    party: false,
    hours: 50,
    numDays: 30,
    startDate: YearMonthDay.get(2017, 3, 3),
    endDate: YearMonthDay.get(2017, 4, 1),
    artwork: "artwork.jpg",
    ...overrides,
  }) as VideoGame;

/** A raw sheet row as `arrayToJson` hands it over: every column present, every value a string. */
export const gameRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Title: "Breath of the Wild",
  Platform: "Nintendo Switch",
  Series: "",
  "Series #": "",
  Franchise: "Zelda",
  Developer: "Nintendo EPD",
  Publisher: "Nintendo",
  Genre: "Adventure",
  Gameplay: "Action Adventure",
  Themes: "Fantasy",
  Certificate: "12",
  Format: "Physical",
  "Release Date": "2017-03-03",
  "Start Date": "2017-03-03",
  "End Date": "2017-04-01",
  Hours: "50",
  Status: "Beat",
  Artwork: "botw.jpg",
  ...overrides,
});
