import { bookModule } from "../book/module";
import type { MediumModule, OmniItem } from "../common/medium";
import { movieModule } from "../movie/module";
import { showModule } from "../show/module";
import { MEDIA as MEDIA_ORDER, type Medium } from "../utils/types";
import { gameModule } from "../game/module";
import type { LibraryRecord, UnitRecord } from "./records";

/**
 * The four media, as one lookup.
 *
 * This is the composing layer: the four tracked domains compose nothing and may not import each
 * other, so every question of the form "what does this medium answer" is asked here rather than as
 * a `switch` in whichever surface happened to need it first. A surface holding one medium reads
 * `MEDIA.game`, one walking all four `eachMedium`, and one holding items of four media `moduleOf`;
 * a fifth medium is a folder and a line in this object.
 *
 * A mapped type and not `Record<Medium, MediumModule<unknown, unknown>>`: erased, every module in
 * the record takes every medium's records, so `MEDIA.game.guestFilter` type-checks against the
 * book library and a walk over the four can hand one medium's rule another's rows — a page
 * silently emptied, with nothing to compile against. Keyed on the medium, the pairing is the
 * registry's own. `MediumModule` still declares every member taking a record as a method, which is
 * what lets a caller holding the whole `Medium` union read the shape at all.
 *
 * Nothing in this folder imports `tabs.ts`. `tabs.ts` imports the five entry components eagerly
 * and an entry component reaches this registry, so an import back would evaluate `MEDIA` while
 * `tabs.ts` was still in its own temporal dead zone. A module carries `tabId` instead, and the one
 * component that resolves an id to a tab sits above both.
 */
export const MEDIA: { [M in Medium]: MediumModule<LibraryRecord[M], UnitRecord[M]> } = {
  game: gameModule,
  show: showModule,
  movie: movieModule,
  book: bookModule,
};

/**
 * The four in the order the app says them, each still paired with its own records — for a caller
 * that walks every medium rather than answering for one.
 *
 * A callback rather than an array, because the pairing only survives one medium at a time: an
 * array's element type is the union of the four modules, which relates a module to no particular
 * library. The parameter is generic so each visit is typed for the medium it is visiting.
 *
 * The order is read off the medium union's own rather than listed again here, so the order the
 * union's rows come out in and the order a legend names the media are one statement: listed twice,
 * a fifth medium can be appended in one and inserted in the other, and nothing says which is meant.
 */
export const eachMedium = <R>(
  visit: <M extends Medium>(medium: M, module: MediumModule<LibraryRecord[M], UnitRecord[M]>) => R,
): R[] => MEDIA_ORDER.map((medium) => visit(medium, MEDIA[medium]));

/**
 * The same four as a flat list, for the walks that ask a module nothing about its records — a tab
 * id, a store, the noun a population is counted in. Erased, since there is nothing here to pair
 * the module with.
 */
export const mediaModules: readonly MediumModule<unknown, unknown>[] = MEDIA_ORDER.map((medium) => MEDIA[medium]);

/**
 * The module an item of the union belongs to.
 *
 * Erased, and the one place that is: an `OmniItem` carries its own record as `source: object`, so
 * a caller dispatching on `item.medium` has no type left to pair the module with — which is the
 * trade `OmniItem` already makes, naming the four records there being the domain import the
 * layering forbids. Every arm is one line reading `item.source` straight back into its own domain.
 */
export const moduleOf = (item: OmniItem): MediumModule<unknown, unknown> => MEDIA[item.medium];

/**
 * The artwork an item is shown as, which is its own tab's: a season is drawn as its show, since
 * the sheets hold one banner per show and a season has no picture of its own.
 *
 * The browse surfaces are walls of pictures, so an item with none is not on them — the rule
 * `finishedItems` already applies to every domain's library grid.
 */
export const omniArtwork = (item: OmniItem): string | undefined => moduleOf(item).artwork(item.source);
