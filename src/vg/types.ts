import type { Year, YearMonthDay } from "../common/date";
import { statusToColour, type Colour, type KeysMatching } from "../utils/types";

export interface VideoGame {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  genre: Genre;
  theme: string[];
  rating: string;
  releaseDate: YearMonthDay;
  format: Format;
  status: Status;
  party?: boolean;
  hours?: number;
  numDays?: number;
  banner?: string;
  startDate: YearMonthDay | Year;
  endDate?: YearMonthDay | Year;
}

export type VideoGameStringKeys = KeysMatching<VideoGame, string>;

export const videoGameOptions: readonly VideoGameStringKeys[] = [
  "genre",
  "company",
  "platform",
  "status",
  "format",
  "rating",
  "developer",
  "publisher",
  "franchise",
  "name",
];

export type Format = "Physical" | "Digital" | "Pirated" | "Subscription";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog" | "Next";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | "Xbox";
export type Platform = `${Company}${string}`;
export type Genre =
  | "Action"
  | "Adventure"
  | "Action Adventure"
  | "Driving/Racing"
  | "Fighting"
  | "Party Games"
  | "Platformer"
  | "Puzzle"
  | "Role Playing"
  | "Shooter"
  | "Simulation"
  | "Strategy"
  | "Visual Novel"
  | "Music/Rhythm";

export type Measure = "Hours" | "Games";

/**
 * A company has two colours, and which one is right depends on how much of the screen it covers.
 *
 * The fills below are the ones chart geometry uses — sunburst wedges, barchart series, timeline
 * bars, stacked segments, card strips. They sit in one lightness band, so each clears 3:1 against
 * both surfaces the app paints on (#ffffff paper and #1d2126 paper), and each keeps its brand's
 * hue. A brand hex is chosen to stand alone against white, and a set of them is not a scale:
 * Nintendo's #e60012 at full saturation beside four neighbours reads as one shouting value.
 *
 * PC and iOS stay neutral because neutrality is those brands' identity — a taupe and a space
 * grey, clamped only in lightness. Giving either a real hue would make it separable at a glance
 * but would name the wrong brand; a blue-violet iOS in particular reads as PlayStation's
 * neighbour. The cost is that the two neutrals separate from each other and from PlayStation by
 * lightness and warmth rather than hue, which is below what colour alone should carry — the
 * wedge labels, legend names and the 2px gaps between segments are load-bearing for those pairs.
 */
const nintendoFill = "#c25e55" as Colour;
const playstationFill = "#4b7cba" as Colour;
const xboxFill = "#4d965f" as Colour;
const pcFill = "#9d8358" as Colour;
const iosFill = "#6e737a" as Colour;

/**
 * The brand hexes, for the chip in a card's corner. A chip is a few dozen pixels of solid colour
 * carrying two or three letters, so it is read as a badge rather than compared against its
 * neighbours — full saturation is what makes it recognisable at that size, and there is no
 * adjacent wedge for it to have to separate from.
 */
const nintendoAccent = "#e60012" as Colour;
const playstationAccent = "#0070cc" as Colour;
const xboxAccent = "#107c10" as Colour;
const pcAccent = "#b5a596" as Colour;
const iosAccent = "#555555" as Colour;

export const companyToColor = ({ company }: { company: Company }) => {
  switch (company) {
    case "Nintendo":
      return nintendoFill;
    case "PlayStation":
      return playstationFill;
    case "Xbox":
      return xboxFill;
    case "PC":
      return pcFill;
    case "iOS":
      return iosFill;
  }
};

export const companyToAccent = ({ company }: { company: Company }) => {
  switch (company) {
    case "Nintendo":
      return nintendoAccent;
    case "PlayStation":
      return playstationAccent;
    case "Xbox":
      return xboxAccent;
    case "PC":
      return pcAccent;
    case "iOS":
      return iosAccent;
  }
};

/**
 * Every platform the app understands, and the short name charts label it with.
 *
 * This is also the set `platformToColor` validates against, so a console added here is
 * understood everywhere at once.
 */
const platformShortNames: Record<Platform, string> = {
  "PlayStation 2": "PS2",
  "PlayStation 3": "PS3",
  "PlayStation P": "PSP",
  "PlayStation 4": "PS4",
  "PlayStation 5": "PS5",
  "Nintendo Wii": "Wii",
  "Nintendo GBC": "GBC",
  "Nintendo GBA": "GBA",
  "Nintendo DS": "DS",
  "Nintendo 3DS": "3DS",
  "Nintendo Switch": "NSW",
  "Nintendo Switch 2": "NSW2",
  PC: "PC",
  iOS: "iOS",
  "Xbox 360": "360",
};

/**
 * A platform's colour is its company's, which is the first word of the platform string — the
 * same split `converter.ts` derives `company` with.
 *
 * Throws unless the platform is known *and* that first word is a company with a colour.
 * `companyToColor` has no default branch, so a platform whose first word is not a bare company
 * name would otherwise return `undefined` and render as an uncoloured bar.
 */
export const platformToColor = (platform: Platform | { platform: Platform }) => {
  const value = typeof platform === "object" ? platform.platform : platform;
  const colour = platformShortNames[value] && companyToColor({ company: value.split(" ")[0] as Company });
  if (!colour) throw new Error("Unknown platform: " + value);
  return colour;
};

/**
 * The corner chip: a short console name and the company's accent, which is the one place the
 * brand hex is drawn rather than the chart fill.
 */
export const platformToShort: (vg: VideoGame) => [string, Colour] = (vg) => {
  const short = platformShortNames[vg.platform];
  if (!short) throw new Error("Unknown platform: " + vg.platform);
  return [short, companyToAccent(vg)];
};

export const ratingToColour = ({ rating }: VideoGame) => {
  switch (rating) {
    case "3+":
      return "#88c32f" as Colour;
    case "7+":
      return "#6d9c26" as Colour;
    case "12+":
      return "#c27400" as Colour;
    case "16+":
      return "rgb(242,144,0)" as Colour;
    case "18+":
      return "#d60015" as Colour;
    default:
      throw new Error("Unknown rating: " + rating);
  }
};

/**
 * Genres carry no colour of their own, so this ramp is chosen rather than reproduced. Hue is
 * what separates two genres and luminance is held equal across all of them, which is what lets
 * one set of values sit on a #ffffff card and a #1d2126 card alike. A colour picked for the
 * light card alone washes out on the dark one; `#ffeb3b` against white is 1.22:1.
 *
 * Ratings and franchises deliberately do not draw on this: a rating ramp encodes an order and a
 * franchise colour is somebody's brand, so neither is free to be reassigned for contrast.
 */
const genreToColour = ({ genre }: { genre: Genre }) => {
  switch (genre) {
    case "Action":
      return "#d55b4e" as Colour;
    case "Adventure":
      return "#2b944e" as Colour;
    case "Action Adventure":
      return "#c06d24" as Colour;
    case "Driving/Racing":
      return "#9f7d1a" as Colour;
    case "Fighting":
      return "#cc5e79" as Colour;
    case "Party Games":
      return "#c859a3" as Colour;
    case "Platformer":
      return "#3985d1" as Colour;
    case "Puzzle":
      return "#9a6dcc" as Colour;
    case "Role Playing":
      return "#7e76d1" as Colour;
    case "Shooter":
      return "#658697" as Colour;
    case "Simulation":
      return "#24908c" as Colour;
    case "Strategy":
      return "#6b7fbd" as Colour;
    case "Visual Novel":
      return "#b761be" as Colour;
    case "Music/Rhythm":
      return "#668e2f" as Colour;
    default:
      return "#7d828c" as Colour;
  }
};

const franchiseToColour = ({ franchise }: { franchise: string }) => {
  switch (franchise) {
    case "Pokémon":
      return "#FFCB05" as Colour;
    case "Final Fantasy":
      return "#00AEEF" as Colour;
    case "Ace Attorney":
      return "#1434A4" as Colour;
    case "Mario":
      return "#E60012" as Colour;
    case "Call of Duty":
      return "#4B5320" as Colour;
    case "Dragon Ball":
      return "#F85B1A" as Colour;
    case "Assassin's Creed":
      return "#D1D5DB" as Colour;
    case "Legend of Zelda":
      return "#1A8A34" as Colour;
    case "Marvel":
      return "#ED1D24" as Colour;
    case "Tales":
      return "#4FD1C5" as Colour;
    case "Uncharted":
      return "#C3B091" as Colour;
    case "Yakuza":
      return "#A31925" as Colour;
    case "Super Smash Bros.":
      return "#FF4500" as Colour;
    case "Xenoblade":
      return "#E60026" as Colour;
    case "Fate":
      return "#B91216" as Colour;
    case "Warcraft":
      return "#F8B700" as Colour;
    case "Mass Effect":
      return "#D12026" as Colour;
    case "Witcher":
      return "#9CA3AF" as Colour;
    case "Civilization":
      return "#005E9B" as Colour;
    case "Persona":
      return "#10145A" as Colour;
    default:
      return "" as Colour;
  }
};

export const groupToColour = (group: keyof VideoGame | "none", game: VideoGame) => {
  switch (group) {
    case "company":
      return companyToColor(game);
    case "status":
      return statusToColour(game);
    case "rating":
      return ratingToColour(game);
    case "genre":
      return genreToColour(game);
    case "franchise":
      return franchiseToColour(game);
    default:
      return "" as Colour;
  }
};
