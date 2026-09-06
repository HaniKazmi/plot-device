import type { FunctionComponent, ReactNode } from "react";
import type { CardMediaImageProps, PanelStat, PanelSubtitlePart } from "./Card";
import type { Year, YearMonthDay, YearNumber } from "./date";
import type { PageStore } from "./filterReducer";
import type { PageSchema } from "./filterSchema";
import type { FranchiseEntry } from "./franchiseUnion";
import type { DataConfig } from "./useData";
import type { Certificate, Medium, Scheme } from "../utils/types";

/**
 * One thing watched, played or read, in the vocabulary the four media share.
 *
 * `source` keeps the record it was built from, so a card adapter renders the domain's own artwork
 * and detail panel rather than a second, poorer copy of it. That a `Season` source carries a
 * `show` back-reference is safe only because **the composing tab writes no cache of its own**: it
 * reads the four domains' caches through their own configs, and the `show` key is dropped and
 * revived by the pair that travels with the Shows config. An `OmniItem` may itself never carry a
 * field named `show`, and needs no replacer/reviver rules, for exactly that reason — the day this
 * tab caches anything, both facts stop holding.
 *
 * The shape is declared here rather than in the composing folder because each domain's own
 * `module.ts` builds its arm of the union, and a tracked domain may not import another or the
 * folder that composes them. `FranchiseEntry` above is the same arrangement for the same reason.
 *
 * `source` is `object` and not the union of the four records: naming that union here would be
 * exactly the domain import the layering forbids. Nothing reads it without asserting a type
 * anyway — the four are records TypeScript cannot tell apart by shape, and `medium` is the
 * discriminant the item already carries — so what `object` costs is a writer putting a string
 * where a record belongs, which every arm below is one line long enough to rule out by eye.
 */
export interface OmniItem {
  medium: Medium;
  /**
   * What identifies this item among the union, for a React key and for a card's own name.
   *
   * Built from the tuple its own domain already treats as unique — a game's title, platform and
   * start; a show's name and season number; a film's title and watch date — because no field the
   * union shares is one. Every season of a show carries its show's name, a film watched twice is
   * two rows with one title, and a game's close can be a bare year, so two copies of one title on
   * two platforms finished in that year answer identically on medium, name and close together.
   */
  key: string;
  /** A season answers with its show's name; which season it is stays on `source`. */
  name: string;
  /**
   * When it finished, absent while it is still going. A film has no separate close — being
   * watched is the whole of it — so its watch date is also its close.
   *
   * The two concrete kinds all four sheets record, rather than a bare `PlainDate`: a card states
   * this date in the reader's own form, and `formatDate` takes the kinds that have one. A
   * `YearMonth` has no such form and no sheet holds one.
   */
  closeDate?: YearMonthDay | Year;
  /**
   * The year it counts towards: the year it ended, or the year it started where it has not.
   * Always answerable, since every record in all four sheets carries a start.
   */
  year: YearNumber;
  /**
   * Exact hours, so a total is floored once at the end rather than per item. Flooring here would
   * count a 96-minute film as one hour and drop a fifth of the movie library, and the union's
   * per-medium totals would then disagree with the figure each home tab shows for the same rows.
   */
  hours: number;
  genre: string;
  /** The genres beyond the primary one. Empty for a game or a book: those sheets record one. */
  genres: string[];
  franchise: string;
  /**
   * Absent for a book: nothing certifies one. Every surface grouping on the certificate drops an
   * item with none rather than shelving it under a blank — the one category not every medium
   * records, stated here rather than answered with a certificate nobody issued.
   */
  certificate?: Certificate;
  source: object;
}

/**
 * How many entries of each medium a set of rows holds, which is what every "which libraries is
 * this in" line is drawn from — a franchise's hit in the search box, and the franchise view's own
 * header above the same series.
 *
 * A medium with nothing in the rows is absent rather than held at zero, which is exactly what the
 * row drawing it says nothing about.
 */
export const countByMedium = (items: readonly OmniItem[]): Partial<Record<Medium, number>> => {
  const counts: Partial<Record<Medium, number>> = {};
  for (const item of items) counts[item.medium] = (counts[item.medium] ?? 0) + 1;
  return counts;
};

/**
 * When an entry ran, as every surface that places one on a scale reads it.
 *
 * Taken off `FranchiseEntry` rather than declared beside it, so a card's strip mark, a crossings
 * lane and a packed row are three drawings of one answer: a domain builds its entry from its span,
 * and a chart that wants only the dates asks for the span alone.
 */
export type MediumSpan = Pick<FranchiseEntry, "start" | "end" | "precise">;

/** The props a card takes once its list has chosen the item, which is all a dispatcher forwards. */
type CardProps<S> = Omit<CardMediaImageProps, "image" | "alt" | "detailComponent"> & { item: S };

/**
 * A medium's components, behind the chunk that draws them.
 *
 * Split off the eager half because a registry keyed by medium is reachable from the shell, so
 * anything it names statically lands in the first bundle a visitor downloads — where every card
 * and hover card in this app is deliberately not. The seam is components and nothing else: a plain
 * accessor put here reaches its domain's cards from whatever asks it, which drags MUI and the card
 * shell into pure data modules — `galleryData.ts` and `searchData.ts` render nothing, and
 * `franchiseUnionData.ts` takes its hover cards as a parameter to stay that way.
 *
 * The members are declared as methods rather than as properties, which is what lets a
 * `MediumLazy<Season>` sit in a record whose element type names no domain: TypeScript checks a
 * method's parameters bivariantly, and a property-typed component is contravariant in its item, so
 * every module would be unassignable to the erased element type the lookup needs.
 *
 * Four members and no more. A medium is looked up by a value (`MEDIA_LAZY[item.medium]`), which a
 * bundler cannot narrow, so everything reachable through this shape is weight on the chunk the
 * union prefetches for its hover cards on every visit. Anything a medium answers that a card does
 * not draw belongs beside the surface that asks for it — `elect` and `nowPanel` are here because
 * what they answer *is* a card, the one the composing tab's Now band leads with, and what they
 * reach for is each domain's `cardData` and `statsData`, which that domain's own card already
 * imports.
 */
export interface MediumLazy<S> {
  CardMediaImage(props: CardProps<S>): ReturnType<FunctionComponent>;
  HoverCard(props: { item: S }): ReturnType<FunctionComponent>;
  /**
   * What this medium is on right now, by its own tab's election — the game in progress, the season
   * the sheet's Last Watched column marks as current, the film watched most recently, the book in
   * hand — and `undefined` where it has nothing in flight, which is a band one card shorter rather
   * than a card saying nothing.
   *
   * The rows come in erased: a lookup across the four relates a module to no particular record,
   * which is the trade the union already makes. The pairing is the registry's own, a medium's
   * module being handed that medium's library.
   */
  elect(rows: readonly unknown[]): S | undefined;
  /** What that item states on the band's card, in this medium's own words. */
  nowPanel(item: S, scheme: Scheme): NowPanel;
}

/**
 * The two Now band answers as one pair, typed on the medium's own record.
 *
 * `MediumLazy` erases the record at the registry, so there the election and the panel are never
 * checked against each other; a domain states its pair through this shape first, where `S` is
 * concrete and a panel reading a season off a show's election fails to compile. Property-typed
 * for that reason, where `MediumLazy`'s members are methods: a property is checked in full, and
 * bivariance is only wanted at the erased lookup. `T` is the row the library holds and `S` what
 * is elected from it, the same record for three media and a season out of a show for the fourth.
 */
export interface NowModule<T, S = T> {
  elect: (rows: T[]) => S | undefined;
  nowPanel: (item: S, scheme: Scheme) => NowPanel;
}

/**
 * What a Now card says about the item its medium is on: why it is shown, when, what it is, and the
 * two or three figures its own tab's hero carries.
 *
 * Data rather than a card, so the band lays all four out one way and each medium keeps its own
 * vocabulary — a game in hours and days in, a season in episodes. `date` is the bare date the
 * phone's cell has room for down a 36px spine, where `kicker` carries the "Since" a card can say.
 */
export interface NowPanel {
  kicker: string;
  date: string;
  title: string;
  subtitle: PanelSubtitlePart[];
  stats: PanelStat[];
}

/**
 * What every tab answers about itself as a *page*: what it counts and in what units, what it can be
 * narrowed by, where that narrowing is held, and the floor its year scope offers.
 *
 * Declared apart from the medium's own answers because the composing tab is a page like any other
 * and no medium at all: it has filters, a measure, a scope and a population, and the surfaces
 * standing above the tabs — the rail, the box that narrows a page — ask exactly these six things of
 * whichever tab is open. Held to those six, the tab that composes the four can satisfy the shape
 * without pretending to be a fifth medium.
 *
 * `M` is the tab's own measure union, which the rail's control needs by name: erased to `string` it
 * would take a dispatch setting any word at all, where the tab's own dispatch sets one of its three.
 * `earliestYear` is a method for `MediumModule`'s own reason, below.
 */
export interface PageModule<T = unknown, M extends string = string> {
  /**
   * `tabId` and not the `Tab`: `tabs.ts` imports the five entry components eagerly and an entry
   * component reaches the registry, so a module naming its tab would have the registry evaluating
   * while `tabs.ts` is still in its own temporal dead zone. The id is a string, and the one module
   * that resolves it to a tab sits above both.
   */
  tabId: string;
  /** What the tab counts in, for a population stated in words: "1,539 games". */
  noun: string;
  /** The units the tab's rail offers, in the order it states them. */
  measures: readonly M[];
  /**
   * What this tab can be narrowed by, as data: the surface offering the filters draws it, and the
   * index of what a search box can find by attribute reads it. The schema carries no icon — see
   * `FilterToggle` — and no rule that is not per-field: a domain whose model answers the year
   * differently, or whose page has a question only it can ask, keeps that predicate beside its own
   * reducer.
   */
  filters: PageSchema;
  /**
   * The tab's filter state, held outside its tree so that the surfaces standing above the page —
   * the rail, the box that filters it — read and set the same value the charts do, and so that a
   * filter can be set on a tab before it is mounted.
   */
  pageState: PageStore;
  /**
   * The oldest year the tab's year scope offers, read from its whole library rather than from what
   * its filters left — derived from the filtered rows, picking "In 2020" would make 2020 the
   * earliest year on offer and strand the reader in it.
   *
   * On the module because the box standing above the tabs draws that scope for whichever tab is
   * open, and the floor is the one part of it a shared control cannot work out for itself: the
   * sheets start in different years, and Movies' is a fixed epoch rather than anything in the rows.
   */
  earliestYear(items: readonly T[]): YearNumber;
}

/**
 * Everything the app asks of a medium, in one place, so that adding a fifth is a folder and a line
 * rather than an edit in every surface that dispatches on which medium it is holding.
 *
 * A medium's tab is a page, so the six answers a page gives come in from `PageModule` above and are
 * not restated here.
 *
 * `T` is what the sheet converts to and the tab filters; `S` is what one row of the union is
 * *about*, which is the same record everywhere but Shows — the Shows sheet converts to `Show` and
 * the union counts in seasons, a season being the thing actually watched.
 *
 * As with `MediumLazy`, every member taking a `T` or an `S` is a method: the lookup hands each
 * module the medium's own records and TypeScript relates the two only through `medium`, so the
 * record's erased element type would reject all four modules if these were properties.
 */
export interface MediumModule<T, S = T, M extends string = string> extends PageModule<T, M> {
  medium: Medium;
  data: DataConfig<T>;
  /**
   * What guest mode keeps. Applied to the library rather than folded into the tab's filters, since
   * an index built from unfiltered data would put a hidden item straight back on screen through a
   * card strip.
   */
  guestFilter(item: T): boolean;
  /** This medium's arm of the union, in the unit the medium is actually logged in. */
  toOmniItems(items: T[]): OmniItem[];
  /** The entry a card's franchise strip draws, so the union and a tab's own index agree. */
  entry(item: S, today: YearMonthDay, hoverCard: () => ReactNode): FranchiseEntry;
  span(item: S, today: YearMonthDay): MediumSpan;
  /** The artwork, absent where the sheet holds none — which keeps the item off a wall of pictures. */
  banner(item: S): string | undefined;
  /** What the item is called on a card, where that is more than the name the union carries. */
  title(item: S): string;
  /**
   * The work an item belongs to, which is what a shelf lists one picture of: a show is one banner
   * however many seasons it ran. Opaque, being a `Map` key and nothing else.
   */
  work(item: S): unknown;
  /** What a hit can be found by besides its name: the people and places a reader remembers it by. */
  secondaryText(item: S): string[];
  /** The line a hit is told by, in this medium's own words, over hours already summed. */
  facts(item: S, hours: number): string;
}
