import { STRIP_GAP } from "./Filmstrip";

/**
 * The strip's own rule, wrapped: each picture at its row's height and its own width, so a wall
 * mixing banners, posters and covers crops none of them. The height reaches the card through a
 * doubled selector for the strip's own reason — a card states its own height in a single class.
 */
export const WALL_SX = {
  display: "flex",
  flexWrap: "wrap",
  gap: `${STRIP_GAP}px`,
  "&& > *": { flex: "0 0 auto" },
} as const;
