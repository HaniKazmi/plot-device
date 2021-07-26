export interface VideoGame {
  game: string;
  platform: string;
  company: string;
  publisher: string;
  franchise: string;
  genre: string[];
  rating: string;
  format: Format;
  status: Status;
  exactDate: boolean;
  startDate?: Date;
  endDate?: Date;
  hours?: string;
}

export interface Tree<K extends keyof any> {
  children: Record<K, Tree<K>>;
  count: number;
}


export type Format = "Physical" | "Digital" | "Pirated";
export type Status = "Playing" | "Endless" | "Abandonded" | "Beat";
