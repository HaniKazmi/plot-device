import { createContext, useContext } from "react";
import type { Book } from "../books/types";
import type { OmniItem } from "../common/medium";
import type { Movie } from "../movie/types";
import type { Show } from "../show/types";
import type { Medium } from "../utils/types";
import type { VideoGame } from "../vg/types";
import { mediaModules } from "./media";
import type { Measure } from "./types";
import "../utils/arrayUtils";

/**
 * What one row of each medium's own sheet converts to. The one place in the app that spells the
 * four records out, so everything below it names a medium instead of a domain.
 */
interface LibraryRecord {
  game: VideoGame;
  show: Show;
  movie: Movie;
  book: Book;
}

/**
 * The four libraries as the domains model them, before anything is flattened.
 *
 * One record rather than four positional arguments: every function here takes all of them, and
 * four same-shaped arrays in a row is an ordering nothing but a type name can defend. Keyed by
 * medium and not by the tabs' plural words, so a caller holding a `Medium` reads its slice off the
 * same key it looked the module up by — and a fifth medium cannot be added to the union's
 * vocabulary without a slice to fill.
 *
 * `Partial` is the shape a reader holds while the sheets are still arriving: each lands on its own,
 * and a tab whose own sheet is here paints from it rather than waiting on the other three.
 */
export type Library = { [M in Medium]: LibraryRecord[M][] };

/**
 * The rows of one medium, as a walk over the registry reads them: the element type there names no
 * domain, so every slice comes back erased and the answer is cast once, here, rather than at each
 * of the three walks below.
 */
const sliceOf = (library: Partial<Library>, medium: Medium) => library[medium] as unknown[] | undefined;

/**
 * Guest mode applied to each library by its own domain's rule, before anything is composed.
 *
 * It has to happen here rather than as one predicate over the union, because the Now band elects
 * from the domain records and never sees an `OmniItem` — a union-level predicate would keep adult
 * games out of the charts while the page headlined one. Everything downstream, elections included,
 * reads what this answers.
 *
 * The libraries are handed back by identity when the mode is off, so the common case allocates
 * nothing and every consumer below the provider re-renders only on a real change.
 */
export const visibleLibrary = (library: Partial<Library>, guestMode: boolean): Partial<Library> => {
  if (!guestMode) return library;

  const visible: Record<string, unknown[] | undefined> = {};
  for (const module of mediaModules)
    visible[module.medium] = sliceOf(library, module.medium)?.filter(module.guestFilter);

  return visible as Partial<Library>;
};

/**
 * The four libraries once all four are here, and nothing until then.
 *
 * A page comparing four media against each other with one of them missing is not a partial answer
 * but a wrong one: a totals band would report shares of a library three quarters present, and the
 * reader has no way to tell. The test is written once so the union, the franchise index and the
 * composing tab cannot disagree about when the library is whole.
 */
export const completeLibrary = (library: Partial<Library>): Library | undefined =>
  mediaModules.every((module) => sliceOf(library, module.medium)) ? (library as Library) : undefined;

/**
 * The four libraries as one flat list, each medium's arm supplied by its own module — so the unit
 * a medium contributes is decided in the folder that models it. Shows contribute seasons rather
 * than shows for that reason, which is a fact about the Shows sheet and not about the union.
 */
export const toOmniItems = (library: Library): OmniItem[] =>
  mediaModules.flatMap((module) => module.toOmniItems(library[module.medium]));

/**
 * Hours over a set of items, floored once.
 *
 * The single home of the floor, so no surface over the union shows a fraction of an hour and
 * every total is the floor of the sum rather than the sum of the floors — the figure each home tab
 * quotes for the same rows.
 */
export const omniHours = (items: OmniItem[]) => Math.floor(items.sum("hours"));

/** What a set of items counts for under the page's own measure. */
export const measureOf = (items: OmniItem[], measure: Measure) =>
  measure === "Hours" ? omniHours(items) : items.length;

/**
 * The four sheets as one value, read by every tab.
 *
 * `raw` is what each converter produced and `visible` is that with guest mode applied, per medium
 * and by each domain's own rule: a tab reads its own slice off `visible`, so the mode is applied
 * once above the tabs rather than a second time inside each of them, where an index built before
 * the filter would put a hidden item straight back on screen through a card strip.
 *
 * `whole` is `visible` once every medium has landed and `items` the union over it, so the two are
 * present together or not at all. Both are answered here rather than by each surface that wants
 * one: two flattenings of one library are two chances to disagree about which rows guest mode
 * hides, and a page asking "is the library whole" for itself is a second answer to a question the
 * union has already been built on.
 *
 * `loaded` is per medium and says whether this session holds the sheet's own rows rather than a
 * previous visit's copy, and `error` what the sheet had to say instead. Both stay per medium so a
 * tab announces its own arrival and its own bad row — a Books converter error belongs on Books, and
 * the Games tab's refresh notice must not wait on three other sheets.
 */
export interface LibraryValue {
  raw: Partial<Library>;
  visible: Partial<Library>;
  whole: Library | undefined;
  items: OmniItem[] | undefined;
  loaded: Record<Medium, boolean>;
  error: Record<Medium, string | undefined>;
}

export const LibraryContext = createContext<LibraryValue | undefined>(undefined);

/**
 * The library as the shell fetched it.
 *
 * Throws where the provider is absent rather than answering with an empty library, which would put
 * a permanently blank tab on screen with nothing anywhere saying why. Every reader is mounted
 * inside the provider by the shell itself, so the throw is a wiring mistake that fails on the first
 * render and never a state real data can reach.
 */
export const useLibrary = (): LibraryValue => {
  const value = useContext(LibraryContext);
  if (!value) throw new Error("useLibrary outside LibraryProvider");
  return value;
};
