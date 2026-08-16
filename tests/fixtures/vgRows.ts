import { YearMonthDay } from "../../src/common/date";
import type { VideoGame } from "../../src/vg/types";

/**
 * Every platform the app claims to understand. `platformToColor` and `platformToShort` are
 * parallel lists in `vg/types.ts`, and this roster is what holds them together: adding a
 * console means adding it here too, and the completeness test then fails until both lists
 * cover it.
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
    genre: "Action Adventure",
    theme: ["Fantasy"],
    rating: "12+",
    releaseDate: YearMonthDay.get(2017, 3, 3),
    format: "Physical",
    status: "Beat",
    party: false,
    hours: 50,
    numDays: 30,
    startDate: YearMonthDay.get(2017, 3, 3),
    endDate: YearMonthDay.get(2017, 4, 1),
    banner: "banner.jpg",
    ...overrides,
  }) as VideoGame;

/** A raw sheet row as `arrayToJson` hands it over: every column present, every value a string. */
export const vgRow = (overrides: Record<string, string> = {}): Record<string, string> => ({
  Game: "Breath of the Wild",
  Platform: "Nintendo Switch",
  Franchise: "Zelda",
  Genre: "Action Adventure",
  Theme: "Fantasy",
  Format: "Physical",
  Developer: "Nintendo EPD",
  Publisher: "Nintendo",
  Rating: "12+",
  Status: "Beat",
  "Start Date": "2017-03-03",
  "End Date": "2017-04-01",
  Release: "2017-03-03",
  Hours: "50",
  Banner: "botw.jpg",
  ...overrides,
});
