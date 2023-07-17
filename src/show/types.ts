import { KeysMatching } from "../utils/types";

export interface Show {
  name: string;
  status: Status;
  startDate: Date;
  endDate?: Date;
  anime: boolean;
  s: Season[];
  e: number;
  minutes: number;
  banner?: string;
}

export interface Season {
  s: number;
  e: number;
  startDate: Date;
  endDate?: Date;
  episodeLength: number;
  minutes: number;
}

export type Status = "Watching" | "Up To Date" | "Ended" | "Cancelled" | "Abandoned";

export type ShowKeys = keyof Show;
export type ShowStringKeys = KeysMatching<Show, string>;

export type Measure = "Hours" | "Episodes";
