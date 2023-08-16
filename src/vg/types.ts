import { Show } from "../show/types";
import { KeysMatching } from "../utils/types";

interface VideoGameBase {
  name: string;
  platform: Platform;
  company: Company;
  developer: string;
  publisher: string;
  franchise: string;
  genre: string;
  theme: string[];
  rating: string;
  releaseDate: Date;
  format: Format;
  status: Status;
  hours?: number;
  numDays?: number;
  banner?: string;
}

interface VideoGameWithDate extends VideoGameBase {
  exactDate: true;
  startDate: Date;
  endDate: Date;
}

interface VideoGameWithoutDate extends VideoGameBase {
  exactDate: false;
  startDate?: Date;
  endDate?: Date;
}

export type VideoGame = VideoGameWithDate | VideoGameWithoutDate;

export type VideoGameKeys = keyof VideoGame;
export type VideoGameStringKeys = KeysMatching<VideoGame, string>;

export type Format = "Physical" | "Digital" | "Pirated";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog" | "Next";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | "Xbox";
export type Platform = `${Company}${string}`;

export interface VideoGameTree {
  [key: string]: VideoGameTree | VideoGame;
}

export const isVideoGame = (arg: VideoGameTree | VideoGame): arg is VideoGame => !!arg.name;

export type Measure = "Hours" | "Count";

const nintendoColour = "#e60012";
const playstationColour = "#0070cc";
const xboxColour = "#107c10";
const pcColour = "#b5a596";
const iosColour = "#555555";

export const companyToColor = ({ company }: VideoGame) => {
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
    case "7+":
      return "rgb(137,195,46)";
    case "12+":
    case "16+":
      return "rgb(242,144,0)";
    case "18+":
      return "rgb(214,0,21)";
    default:
      throw new Error("Unknown rating: " + rating);
  }
}

export const statusToColour = ({ status }: VideoGame | Show) => {
  switch (status) {
    case "Abandoned":
      return "rgb(214, 39, 40)";
    case "Beat":
    case "Ended":
      return "rgb(44, 160, 44)";
    case "Cancelled":
      return "rgb(44, 160, 0)";
    case "Endless":
    case "Up To Date":
      return "rgb(31, 119, 180)";
    case "Playing":
    case "Watching":
      return "rgb(23, 190, 207)";
    case "Next":
    case "Backlog":
      return "";
  }
}
