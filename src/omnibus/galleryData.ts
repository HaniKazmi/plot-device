import { groupByCategory, realFranchisesOnly, type DrilldownGroup } from "../common/statsData";
import {
  ageRatingToColour,
  decadeToColour,
  genreToColour,
  releaseDecade,
  type AgeRating,
  type Colour,
} from "../utils/types";
import { measureOf, omniBanner, type OmniItem } from "./adapter";
import type { Measure } from "./types";
import "../utils/arrayUtils";

/**
 * The ways the gallery groups the union.
 *
 * Every one is a field all three media record, which is what a shelf shared between them has to be
 * — a category one medium answers `""` to would drop that medium out of the wall silently, since
 * `groupByCategory` skips empty values.
 */
export const GALLERY_CATEGORIES = ["genre", "franchise", "rating", "decade"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

/**
 * The shelf an item sits on.
 *
 * "Decade" is the decade the reader *met* it, not the decade it was made: shows carry no release
 * date anywhere in the model, so a release decade over the union would be a category two media
 * answer and the third vanishes from. The home tabs' own decade groupings mean the other thing,
 * which is why the label here says so.
 */
export const galleryValue = (item: OmniItem, category: GalleryCategory): string => {
  switch (category) {
    case "genre":
      return item.genre;
    case "franchise":
      return item.franchise;
    case "rating":
      return item.rating;
    case "decade":
      return releaseDecade(item.year);
  }
};

/**
 * The colour a shelf is named in, where the app already speaks that field's colour — a genre, a
 * certificate, a decade. Franchises have no cross-media vocabulary: each tab colours its own, and a
 * swatch invented for the union would teach a legend no chart on the page honours.
 */
export const galleryColour = (name: string, category: GalleryCategory): Colour | undefined => {
  switch (category) {
    case "genre":
      return genreToColour(name);
    case "rating":
      return ageRatingToColour(name as AgeRating);
    case "decade":
      return decadeToColour(name);
    case "franchise":
      return undefined;
  }
};

/**
 * The items the gallery can draw: the ones with artwork.
 *
 * A wall of pictures has nothing to say about an item that has none, which is the rule every
 * domain's library grid already applies. Answered once and handed to both the section and the
 * rail's chip, so a chip cannot offer a shelf with nothing on it.
 */
export const galleryItems = (items: OmniItem[]): OmniItem[] => items.filter((item) => omniBanner(item));

/**
 * The shelves for a category, largest first, each keeping its members for the drill-down.
 *
 * Ordered and measured by the page's own measure, so switching to Items reorders the shelves the
 * way it reorders every other ranking here. A franchise shelf holding one item is dropped on the
 * shared rule: the column repeats a standalone title, so a group of one is an item naming itself
 * rather than a series.
 */
export const galleryGroups = (
  items: OmniItem[],
  category: GalleryCategory,
  measure: Measure,
): DrilldownGroup<OmniItem>[] =>
  groupByCategory(
    items,
    (item) => galleryValue(item, category),
    (group) => measureOf(group, measure),
    // The shelf's biggest entry fronts it, and is also the first picture on it — a shelf leads
    // with the thing the reader spent most of it on.
    (group) => galleryStripOrder(group)[0],
    category === "franchise" ? realFranchisesOnly : undefined,
  );

/** A shelf's own order: biggest first, which is the order its fronting card claims. */
export const galleryStripOrder = (items: OmniItem[]): OmniItem[] => items.sortByKey("hours");
