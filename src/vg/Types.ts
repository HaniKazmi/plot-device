export interface VideoGame {
  game: string;
  platform: Platform;
  company: Company;
  publisher: string;
  franchise: string;
  genre: string[];
  theme: string[];
  rating: string;
  format: Format;
  status: Status;
  exactDate: boolean;
  startDate?: Date;
  endDate?: Date;
  hours?: string;
}

export type VideoGameKeys = keyof VideoGame;

export type Format = "Physical" | "Digital" | "Pirated";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | 'Xbox'
export type Platform = `${Company}${string}`

export interface VideoGameTree {
  [key: string]: VideoGameTree | VideoGame;
}

export const isVideoGame = (arg: VideoGameTree | VideoGame): arg is VideoGame => !!arg.game;
