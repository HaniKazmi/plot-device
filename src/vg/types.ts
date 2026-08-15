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

const nintendoColour = "#e60012" as Colour;
const playstationColour = "#0070cc" as Colour;
const xboxColour = "#107c10" as Colour;
const pcColour = "#b5a596" as Colour;
const iosColour = "#555555" as Colour;

export const companyToColor = ({ company }: { company: Company }) => {
  switch (company) {
    case "Nintendo":
      return nintendoColour;
    case "PlayStation":
      return playstationColour;
    case "Xbox":
      return xboxColour;
    case "PC":
      return pcColour;
    case "iOS":
      return iosColour;
  }
};

export const platformToColor = (platform: Platform | { platform: Platform }) => {
  if (typeof platform === "object") {
    platform = platform.platform;
  }
  switch (platform) {
    case "PlayStation 2":
    case "PlayStation 3":
    case "PlayStation P":
    case "PlayStation 4":
    case "PlayStation 5":
      return playstationColour;
    case "Nintendo Wii":
    case "Nintendo GBC":
    case "Nintendo GBA":
    case "Nintendo DS":
    case "Nintendo 3DS":
    case "Nintendo Switch":
    case "Nintendo Switch 2":
      return nintendoColour;
    case "PC":
      return pcColour;
    case "iOS":
      return iosColour;
    case "Xbox 360":
      return xboxColour;
    default:
      throw new Error("Unknown platform: " + platform);
  }
};

const platformShortNames: Record<string, string> = {
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

export const platformToShort: (vg: VideoGame) => [string, Colour] = (vg) => {
  const short = platformShortNames[vg.platform];
  if (!short) throw new Error("Unknown platform: " + vg.platform);
  return [short, companyToColor(vg)];
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

const genreToColour = (genre: Genre | { genre: Genre }) => {
  if (typeof genre === "object") {
    genre = genre.genre;
  }

  switch (genre) {
    case "Action":
      return "#f44336" as Colour;
    case "Adventure":
      return "#4caf50" as Colour;
    case "Action Adventure":
      return "#ff9800" as Colour;
    case "Driving/Racing":
      return "#ffeb3b" as Colour;
    case "Fighting":
      return "#d32f2f" as Colour;
    case "Party Games":
      return "#e91e63" as Colour;
    case "Platformer":
      return "#03a9f4" as Colour;
    case "Puzzle":
      return "#9c27b0" as Colour;
    case "Role Playing":
      return "#673ab7" as Colour;
    case "Shooter":
      return "#607d8b" as Colour;
    case "Simulation":
      return "#00bcd4" as Colour;
    case "Strategy":
      return "#3f51b5" as Colour;
    case "Visual Novel":
      return "#ff4081" as Colour;
    case "Music/Rhythm":
      return "#cddc39" as Colour;
    default:
      return "#9e9e9e" as Colour;
  }
};

const franchiseToColour = (franchise: string | { franchise: string }) => {
  if (typeof franchise === "object") {
    franchise = franchise.franchise;
  }

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
