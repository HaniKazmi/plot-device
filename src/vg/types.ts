import { Status as ShowStatus } from "../show/types";
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
  startDate: Date;
}

interface VideoGameWithDate extends VideoGameBase {
  exactDate: true;
  endDate: Date;
}

interface VideoGameWithoutDate extends VideoGameBase {
  exactDate: false;
  endDate?: Date;
}

export type VideoGame = VideoGameWithDate | VideoGameWithoutDate;

export type VideoGameKeys = keyof VideoGame;
export type VideoGameStringKeys = KeysMatching<VideoGame, string>;

export type Format = "Physical" | "Digital" | "Pirated" | "Subscription";
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

export const platformToColor = (platform: string) => {
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
};

export const statusToColour = ({ status }: { status: Status | ShowStatus }) => {
  switch (status) {
    case "Abandoned":
      return "#d62728";
    case "Beat":
    case "Ended":
      return "#2ca02c";
    case "Cancelled":
      return "#d67728";
    case "Endless":
    case "Up To Date":
      return "#1f77b4";
    case "Playing":
    case "Watching":
      return "#17becf";
    case "Next":
    case "Backlog":
      return "";
  }
};
