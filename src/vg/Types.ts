export type KeysMatching<T, V> = keyof { [P in keyof T as T[P] extends V ? P : never]: P };
export type Predicate<T> = (input: T) => boolean;

interface VideoGameBase {
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
  hours?: number;
  numDays?: number;
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

export type VideoGame = VideoGameWithDate | VideoGameWithoutDate

export type VideoGameKeys = keyof VideoGame;
export type VideoGameStringKeys = KeysMatching<VideoGame, string>;

export type Format = "Physical" | "Digital" | "Pirated";
export type Status = "Playing" | "Endless" | "Abandoned" | "Beat" | "Backlog";
export type Company = "PlayStation" | "Nintendo" | "PC" | "iOS" | "Xbox";
export type Platform = `${Company}${string}`;

export interface VideoGameTree {
  [key: string]: VideoGameTree | VideoGame;
}

export const isVideoGame = (arg: VideoGameTree | VideoGame): arg is VideoGame => !!arg.game;

export type Measure = "Hours" | "Count";
