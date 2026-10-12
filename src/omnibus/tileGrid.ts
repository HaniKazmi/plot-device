import { rowCardSize } from "../common/rowSizing";

/**
 * The grid the yearbook's years and the franchise wall's cards stand in, one rule for both so the
 * two halves of their pair cannot drift apart: tiles no narrower than `TILE_MIN_WIDTH` from `sm`
 * up, as many as fit, and two to a row on a phone whatever their width comes to.
 */
export const TILE_MIN_WIDTH = 220;
export const PHONE_PER_ROW = 2;
export const TILE_GAP = 16;
/** The gap between the pictures inside a tile. */
export const PICTURE_GAP = 4;

export const TILE_GRID_SX = {
  display: "grid",
  gridTemplateColumns: {
    xs: `repeat(${PHONE_PER_ROW}, minmax(0, 1fr))`,
    sm: `repeat(auto-fill, minmax(${TILE_MIN_WIDTH}px, 1fr))`,
  },
  gap: `${TILE_GAP}px`,
} as const;

/**
 * How many tiles a row of the grid holds at a measured width, which a cut stated in rows multiplies:
 * the row-sizing rule every sized row solves, a tile having no height of its own to state.
 */
export const tilesPerRow = (width: number | undefined, phone: boolean) =>
  phone ? PHONE_PER_ROW : rowCardSize({ minWidth: TILE_MIN_WIDTH, heightFor: () => 0 }, width, TILE_GAP).count;
