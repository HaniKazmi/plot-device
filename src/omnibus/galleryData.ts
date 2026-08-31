import { groupByCategory, realFranchisesOnly, type DrilldownGroup } from "../common/statsData";
import {
  ageRatingToColour,
  decadeToColour,
  genreToColour,
  releaseDecade,
  type AgeRating,
  type Colour,
} from "../utils/types";
import type { Movie } from "../movie/types";
import type { Season } from "../show/types";
import { measureOf, omniBanner, type OmniItem } from "./adapter";
import type { Measure } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

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
 * The work an item belongs to, which is what a shelf lists one picture of.
 *
 * A season is the unit the union counts in everywhere else — it is the thing actually watched in a
 * year — but a wall of pictures draws one banner per show, so a six-season show would stand on its
 * genre shelf as six copies of the same artwork and crowd every other show off the strip. Shows key
 * on the parent record itself, which is exact: every season of one show holds the same object. A
 * film keys on its title and release, so a rewatch joins the first viewing while a remake of the
 * same name stays a work of its own. A game is already one row per work and keys on that row.
 */
const workOf = (item: OmniItem): unknown => {
  switch (item.medium) {
    case "show":
      return (item.source as Season).show;
    case "movie": {
      const movie = item.source as Movie;
      return `${movie.name}-${movie.releaseDate}`;
    }
    case "game":
      return item.source;
  }
};

/**
 * One item per work per shelf, carrying the work's whole time on that shelf.
 *
 * Collapsing per shelf rather than over the union is what keeps a shelf's own meaning: a show whose
 * seasons closed in two decades genuinely met the reader in both, and stands once on each. The
 * representative is the biggest member, so the picture is the one the reader spent most of, and its
 * hours are the bucket's sum — which is what leaves both measures honest through `measureOf`, Items
 * counting works and Hours still counting every season.
 */
export const galleryWorks = (items: OmniItem[], category: GalleryCategory): OmniItem[] => {
  const shelves = new Map<string, Map<unknown, OmniItem[]>>();
  for (const item of items) {
    shelves
      .setIfAbsent(galleryValue(item, category), new Map<unknown, OmniItem[]>())
      .setIfAbsent(workOf(item), [])
      .push(item);
  }

  return [...shelves.values()].flatMap((works) =>
    [...works.values()].map((entries) =>
      entries.length === 1 ? entries[0] : { ...galleryTop(entries), hours: entries.sum("hours") },
    ),
  );
};

/**
 * The shelves for a category, largest first, each keeping its members for the drill-down.
 *
 * Ordered and measured by the page's own measure, so switching to Items reorders the shelves the
 * way it reorders every other ranking here. A franchise shelf holding one work is dropped on the
 * shared rule: the column repeats a standalone title, so a group of one is an item naming itself
 * rather than a series — counted in works, so a single show carrying its own name as a franchise is
 * one entry however many seasons it ran.
 */
export const galleryGroups = (
  items: OmniItem[],
  category: GalleryCategory,
  measure: Measure,
): DrilldownGroup<OmniItem>[] =>
  groupByCategory(
    galleryWorks(items, category),
    (item) => galleryValue(item, category),
    (group) => measureOf(group, measure),
    // The shelf's biggest entry fronts it, and is also the first picture on it — a shelf leads
    // with the thing the reader spent most of it on.
    galleryTop,
    category === "franchise" ? realFranchisesOnly : undefined,
  )
    // Ordered once here rather than again at each surface: the shelf, its drill-down and the card
    // fronting it all read one array, so the strip cannot open with a different picture than the
    // one the group claims.
    .map((group) => ({ ...group, all: galleryStripOrder(group.all) }));

/** A shelf's own order: biggest first, which is the order its fronting card claims. */
export const galleryStripOrder = (items: OmniItem[]): OmniItem[] => items.sortByKey("hours");

/**
 * The biggest of a set, read in one pass rather than by sorting the whole of it to look at the
 * front. `>` keeps the first of equals, which is the order a stable sort would have left them in.
 */
const galleryTop = (items: OmniItem[]): OmniItem =>
  items.reduce((best, item) => (item.hours > best.hours ? item : best));
