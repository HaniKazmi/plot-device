import { groupByCategory, realFranchisesOnly, type DrilldownGroup } from "../common/statsData";
import type { PlainDate, Year, YearMonthDay } from "../common/date";
import {
  ageBandToColour,
  ageRatingBand,
  decadeToColour,
  franchiseToColour,
  genreToColour,
  releaseDecade,
  type Colour,
  type Scheme,
} from "../utils/types";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import type { Season } from "../show/types";
import { measureOf, omniBanner, type OmniItem } from "./adapter";
import type { Measure } from "./types";
import "../utils/arrayUtils";
import "../utils/mapUtils";

/**
 * The ways the gallery groups the union.
 *
 * Every one but rating is a field all four media record, which is what a shelf shared between them
 * has to be — a category one medium answers `""` to drops that medium out of the wall, since
 * `groupByCategory` skips empty values. Rating is the deliberate exception: nothing certifies a
 * book, so books are absent from the rating shelves rather than shelved under a certificate nobody
 * issued, and `galleryValue` answers `""` for them on purpose.
 */
export const GALLERY_CATEGORIES = ["genre", "franchise", "rating", "decade"] as const;

export type GalleryCategory = (typeof GALLERY_CATEGORIES)[number];

/**
 * The two questions the wall can be asked: what the library is mostly made of, and what it has been
 * made of lately.
 *
 * One order for both the shelves and the pictures on them. A gallery whose shelves came newest
 * first while every strip still led with a decade-old entry would be answering the two questions at
 * once, and the shelf's fronting card follows the same order for the same reason.
 *
 * The shelves are cut after the sort, not before it: the six the card holds are the six biggest or
 * the six most recent, and the header states the count either way. Selecting by size and only
 * reordering what survived would make Recent the recent among the biggest, which is the question
 * neither control asks.
 */
export const GALLERY_SORTS = ["size", "recent"] as const;

export type GallerySort = (typeof GALLERY_SORTS)[number];

/**
 * The shelf an item sits on.
 *
 * "Decade" is the decade the reader *met* it, not the decade it was made: shows carry no release
 * date anywhere in the model, so a release decade over the union would be a category two media
 * answer and the third vanishes from. The home tabs' own decade groupings mean the other thing,
 * which is why the label here says so.
 *
 * "Rating" is the age band and not the certificate as written: the two boards this library records
 * name one tier differently, so grouping on the cell would shelve a PEGI 16 game apart from the
 * BBFC 15 film it sits at the same age as, and split every other tier by its suffix. The cards
 * themselves still state the certificate their own row carries.
 */
export const galleryValue = (item: OmniItem, category: GalleryCategory): string => {
  switch (category) {
    case "genre":
      return item.genre;
    case "franchise":
      return item.franchise;
    case "rating":
      return item.rating ? ageRatingBand(item.rating) : "";
    case "decade":
      return releaseDecade(item.year);
  }
};

/**
 * The colour a shelf is named in, from the vocabulary the app already speaks for that field — a
 * genre, a certificate, a decade, a franchise. Each is the vocabulary its home tabs draw, so a
 * shelf here wears exactly what the same value wears there.
 */
export const galleryColour = (name: string, category: GalleryCategory, scheme: Scheme): Colour | undefined => {
  switch (category) {
    case "genre":
      return genreToColour(name, scheme);
    case "rating":
      return ageBandToColour(name, scheme);
    case "decade":
      return decadeToColour(name, scheme);
    case "franchise":
      // Empty off the table, which is most of them: a franchise column is mostly works naming
      // themselves, and `undefined` leaves the shelf heading without a swatch rather than
      // inventing one.
      return franchiseToColour({ franchise: name }, scheme) || undefined;
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
 * same name stays a work of its own. A game is already one row per work and keys on that row, and
 * so is a book: a reread is a second row, and it joins the first the way a film's rewatch does.
 */
export const workOf = (item: OmniItem): unknown => {
  switch (item.medium) {
    case "show":
      return (item.source as Season).show;
    case "movie": {
      const movie = item.source as Movie;
      return `${movie.name}-${movie.releaseDate}`;
    }
    case "book": {
      const book = item.source as Book;
      return `${book.name}-${book.releaseDate}`;
    }
    case "game":
      return item.source;
  }
};

/**
 * A work as it stands on a shelf: the union's own item, plus when the reader was last in it.
 *
 * A date rather than the `year` the item already carries. Twelve genres over a library this size
 * nearly all hold something from the current year, so a recency read in years leaves almost every
 * shelf tied and the order is whatever the previous sort left — a control that visibly does
 * nothing. A close date separates them by the day.
 *
 * It is carried beside `year` rather than written over it in any case: `galleryGroups` re-derives a
 * shelf from the collapsed item and the decade category reads `year`, so a show whose seasons
 * closed in two decades — which stands once on each shelf — would have both copies claim the later
 * decade and leave the earlier shelf empty.
 */
export interface ShelfItem extends OmniItem {
  metDate: YearMonthDay | Year;
}

/**
 * One item per work per shelf, carrying the work's whole time on that shelf.
 *
 * Collapsing per shelf rather than over the union is what keeps a shelf's own meaning: a show whose
 * seasons closed in two decades genuinely met the reader in both, and stands once on each. The
 * representative is the biggest member, so the picture is the one the reader spent most of, and its
 * hours are the bucket's sum — which is what leaves both measures honest through `measureOf`, Items
 * counting works and Hours still counting every season.
 */
export const galleryWorks = (items: OmniItem[], category: GalleryCategory, today: YearMonthDay): ShelfItem[] => {
  const shelves = new Map<string, Map<unknown, OmniItem[]>>();
  for (const item of items) {
    shelves
      .setIfAbsent(galleryValue(item, category), new Map<unknown, OmniItem[]>())
      .setIfAbsent(workOf(item), [])
      .push(item);
  }

  return [...shelves.values()].flatMap((works) =>
    [...works.values()].map((entries) => ({
      ...galleryTop(entries),
      hours: entries.sum("hours"),
      // The whole work's last date, not the representative's. The representative is the biggest
      // entry, so a show that was huge in its first season and closed quietly years later would
      // otherwise date from the season it was big in rather than from the one that ended it.
      metDate: latestOf(entries, (entry) => entry.closeDate ?? today),
      // The work's own close, not the representative's: absent while any entry is still going,
      // else the latest, so a caption or a sort reading `closeDate` off a work reads the work.
      closeDate: entries.some((entry) => !entry.closeDate) ? undefined : latestOf(entries, (entry) => entry.closeDate!),
    })),
  );
};

/**
 * The shelves for a category, ordered by the sort, each keeping its members for the drill-down.
 *
 * Under `size` that is the page's own measure, so switching to Items reorders the shelves the way
 * it reorders every other ranking here; under `recent` it is the last year anything on the shelf
 * was met, which every record answers where a close date does not. A franchise shelf holding one
 * work is dropped on the shared rule: the column repeats a standalone title, so a group of one is
 * an item naming itself rather than a series — counted in works, so a single show carrying its own
 * name as a franchise is one entry however many seasons it ran.
 */
export const galleryGroups = (
  items: OmniItem[],
  category: GalleryCategory,
  measure: Measure,
  sort: GallerySort,
  /** Taken as the date of anything still open: an item with no close is the one being met now. */
  today: YearMonthDay,
): Shelf[] =>
  groupByCategory(
    galleryWorks(items, category, today),
    (item) => galleryValue(item, category),
    (group) => measureOf(group, measure),
    // No picker: the shelf reorders its own members below and fronts itself with the first of
    // them, so one chosen here would be reduced over every group and then thrown away.
    undefined,
    category === "franchise" ? realFranchisesOnly : undefined,
  )
    // Ordered once here rather than again at each surface: the shelf, its drill-down and the card
    // fronting it all read one array, so the strip cannot open with a different picture than the
    // one the group claims. `top` is taken from that array rather than from `groupByCategory`'s own
    // pick, because the two agree only while the strip is ordered by size.
    .map((group) => {
      const all = galleryStripOrder(group.all, sort);
      return { ...group, all, top: all[0], metDate: latestOf(all, (item) => item.metDate) };
    })
    // Re-sorted rather than left as `groupByCategory` ordered it, so the one rule that decides the
    // shelves' order is stated here whichever sort is on.
    .toSorted(sort === "recent" ? byLatestMet : byMeasure);

/** A shelf, and when anything standing on it was last met. */
export interface Shelf extends DrilldownGroup<ShelfItem> {
  metDate: PlainDate;
}

/** A shelf's own order, which is the order its fronting card claims. */
export const galleryStripOrder = (items: ShelfItem[], sort: GallerySort): ShelfItem[] =>
  items.toSorted(sort === "recent" ? byLatestMet : (a, b) => b.hours - a.hours);

/**
 * Newest first, on the end of the range each date denotes.
 *
 * `PlainDate` orders by its ISO string, where a shorter string sorts before the longer ones it
 * prefixes — so a bare `Year` reads as that year's 1 January and loses to every dated day inside
 * it. Roughly half the games carry a bare year, which makes the two ends of one genuinely
 * different answers, and the end is the one a question about what was met *last* asks for.
 */
const byLatestMet = <T extends { metDate: PlainDate }>(a: T, b: T) => {
  const left = a.metDate.lastDay();
  const right = b.metDate.lastDay();
  return left < right ? 1 : left > right ? -1 : 0;
};

/**
 * Biggest first, subtracted rather than compared through `sortByKey`.
 *
 * That helper sends a falsy value to the front whichever way it is sorting, and both figures here
 * reach zero honestly: an unrecorded playtime is `0` hours, and a shelf measured in Hours whose
 * members are all unrecorded counts `0`. Either would otherwise lead the order it is least
 * entitled to lead — and `top` is the first of this array, so a shelf would front itself with the
 * one item that has nothing to show.
 */
const byMeasure = (a: { count: number }, b: { count: number }) => b.count - a.count;

/**
 * The biggest of a set, read in one pass rather than by sorting the whole of it to look at the
 * front. `>` keeps the first of equals, which is the order a stable sort would have left them in.
 */
const galleryTop = <T extends OmniItem>(items: T[]): T =>
  items.reduce((best, item) => (item.hours > best.hours ? item : best));

/**
 * The last of a set of dates, read in one pass rather than by sorting to look at the front.
 *
 * The date is reached through an accessor because the two callers ask different fields: a work's
 * own is the latest close among the entries collapsed into it, while a shelf's is the latest
 * `metDate` among its works — reading a close date there would take each work's *representative's*
 * close, and a representative is the biggest entry rather than the last one.
 *
 * Dates are weighed by `lastDay`, on the same rule `byLatestMet` follows and for the same reason:
 * `PlainDate` orders by its ISO string, where a bare `Year` sorts as its 1 January, which is the
 * wrong end of that year to ask a maximum for. The value kept is the date itself rather than its
 * last day, so a shelf reports the precision its sheet actually holds.
 */
const latestOf = <T, D extends PlainDate>(items: T[], dateOf: (item: T) => D): D =>
  items.reduce((latest, item) => (dateOf(item).lastDay() > latest.lastDay() ? dateOf(item) : latest), dateOf(items[0]));
