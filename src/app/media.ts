import { bookModule } from "../books/module";
import type { MediumModule } from "../common/medium";
import { movieModule } from "../movie/module";
import { showModule } from "../show/module";
import { MEDIA as MEDIA_ORDER, type Medium } from "../utils/types";
import { vgModule } from "../vg/module";

/**
 * The four media, as one lookup.
 *
 * This is the composing layer: the four tracked domains compose nothing and may not import each
 * other, so every question of the form "what does this medium answer" is asked here rather than as
 * a `switch` in whichever surface happened to need it first. A surface holding items of four media
 * reads `MEDIA[item.medium]`, and a fifth medium is a folder and a line in this object.
 *
 * The element type names no domain, which is what makes the lookup possible at all: `MEDIA.show`
 * takes `Show`s where `MEDIA.game` takes `VideoGame`s, and the only thing relating a module to the
 * records handed to it is the `medium` the caller looked it up by. `MediumModule` declares every
 * such member as a method for that reason — TypeScript checks a method's parameters bivariantly,
 * and property-typed members would leave all four modules unassignable here.
 *
 * Nothing in this folder imports `tabs.ts`. `tabs.ts` imports the five entry components eagerly
 * and an entry component reaches this registry, so an import back would evaluate `MEDIA` while
 * `tabs.ts` was still in its own temporal dead zone. A module carries `tabId` instead, and the one
 * component that resolves an id to a tab sits above both.
 */
export const MEDIA: Record<Medium, MediumModule<unknown, unknown>> = {
  game: vgModule,
  show: showModule,
  movie: movieModule,
  book: bookModule,
};

/**
 * The same four in the order the app says them, which is the order the tabs themselves run in —
 * for a caller that walks every medium rather than answering for one.
 *
 * Read off the medium union's own order rather than listed again here, so the order the union's
 * rows come out in and the order a legend names the media are one statement: listed twice, a
 * fifth medium can be appended in one and inserted in the other, and nothing says which is meant.
 */
export const mediaModules: readonly MediumModule<unknown, unknown>[] = MEDIA_ORDER.map((medium) => MEDIA[medium]);
