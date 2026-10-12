import { spansMedia, type OmniItem } from "../common/medium";
import { galleryValue, type UnionKey } from "../app/galleryData";

/** A ring is one of the union's own shelving keys, or one of the two a franchise is read by besides. */
export type Ring = Exclude<UnionKey, "franchise"> | "series" | "where";

export const RINGS: readonly Ring[] = ["medium", "series", "genre", "where", "certificate", "style", "decade", "when"];

/** Words for the keys whose own name reads as something else beside "Nest by". */
export const RING_LABELS: Partial<Record<Ring, string>> = { when: "Year finished", where: "Where met" };

/** The rings the wheel opens on, read off the franchise rather than stated once for all of them. */
export const franchiseRings = (items: OmniItem[]): Ring[] => (spansMedia(items) ? ["medium", "series"] : ["series"]);

/**
 * Whether a wheel has anything to say: two media, or two series inside one. A franchise of one
 * series in one medium nests to a single full ring around its own entries, which is the library's
 * shelf drawn as a circle.
 */
export const hasBreakdown = (items: OmniItem[]): boolean => spansMedia(items) || new Set(items.map(seriesOf)).size > 1;

/** A standalone work is a series of itself, as every tab's own sunburst draws one. */
const seriesOf = (item: OmniItem) => item.series || item.name;

export const ringValue = (item: OmniItem, ring: Ring): string => {
  switch (ring) {
    case "series":
      return seriesOf(item);
    case "where":
      return item.venue;
    case "style":
      // A book has no picture to have a style; a blank id would draw it as a nameless wedge.
      return item.style ?? "No style";
    default:
      return galleryValue(item, ring);
  }
};
