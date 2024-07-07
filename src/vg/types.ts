import type { Year, YearMonthDay } from "../common/date";
import { statusToColour, type Colour, type KeysMatching } from "../utils/types";

export interface VideoGame {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  genre: string;
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

export type Format = "Physical" | "Digital" | "Pirated" | "Subscription";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog" | "Next";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | "Xbox";
export type Platform = `${Company}${string}`;

export interface VideoGameTree {
  [key: string]: VideoGameTree | VideoGame;
}

export const isVideoGame = (arg: VideoGameTree | VideoGame): arg is VideoGame => !!arg.name;

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
  if (typeof platform != "string") {
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

export const platformToShort: (vg: VideoGame) => [string, string] = (vg) => {
  switch (vg.platform) {
    case "PlayStation 2":
      return ["PS2", companyToColor(vg)];
    case "PlayStation 3":
      return ["PS3", companyToColor(vg)];
    case "PlayStation P":
      return ["PSP", companyToColor(vg)];
    case "PlayStation 4":
      return ["PS4", companyToColor(vg)];
    case "PlayStation 5":
      return ["PS5", companyToColor(vg)];
    case "Nintendo Wii":
      return ["Wii", companyToColor(vg)];
    case "Nintendo GBC":
      return ["GBC", companyToColor(vg)];
    case "Nintendo GBA":
      return ["GBA", companyToColor(vg)];
    case "Nintendo DS":
      return ["DS", companyToColor(vg)];
    case "Nintendo 3DS":
      return ["3DS", companyToColor(vg)];
    case "Nintendo Switch":
      return ["NSW", companyToColor(vg)];
    case "PC":
      return ["PC", companyToColor(vg)];
    case "iOS":
      return ["iOS", companyToColor(vg)];
    case "Xbox 360":
      return ["360", companyToColor(vg)];
    default:
      throw new Error("Unknown platform: " + vg.platform);
  }
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

export const groupToColour = (group: keyof VideoGame | "none", game: VideoGame) => {
  switch (group) {
    case "company":
      return companyToColor(game);
    case "status":
      return statusToColour(game);
    case "rating":
      return ratingToColour(game);
    default:
      return "" as Colour;
  }
};
