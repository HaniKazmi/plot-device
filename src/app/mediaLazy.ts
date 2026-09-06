import {
  CardMediaImage as BookCard,
  elect as bookElect,
  HoverCard as BookHoverCard,
  nowPanel as bookNowPanel,
} from "../books/module.lazy";
import type { MediumLazy } from "../common/medium";
import {
  CardMediaImage as MovieCard,
  elect as movieElect,
  HoverCard as MovieHoverCard,
  nowPanel as movieNowPanel,
} from "../movie/module.lazy";
import {
  CardMediaImage as ShowCard,
  elect as showElect,
  HoverCard as ShowHoverCard,
  nowPanel as showNowPanel,
} from "../show/module.lazy";
import type { Medium } from "../utils/types";
import {
  CardMediaImage as VgCard,
  elect as vgElect,
  HoverCard as VgHoverCard,
  nowPanel as vgNowPanel,
} from "../vg/module.lazy";

/**
 * The four media's components, as one lookup — `MEDIA`'s other half.
 *
 * The four are named statically rather than each behind an `import()` of its own, because the
 * surface that needs them is a wall of cards: a `lazy()` per medium turns four chunks that arrive
 * *with* the chunk dispatching to them into four round trips after it, and the wall paints blank
 * for the length of them. Nothing eager imports this file, so the four stay out of the first
 * bundle all the same — this module is the whole lazy seam, and a second way to reach a medium's
 * components is a second answer to when their chunk is fetched.
 *
 * Named imports rather than four namespaces: the lookup is dynamic (`MEDIA_LAZY[item.medium]`), so
 * a namespace object is opaque to the bundler and everything the four lazy halves export is pulled
 * into this chunk — the one the union prefetches for its hover cards on every visit. Named, only
 * what is written here can ride along.
 */
export const MEDIA_LAZY: Record<Medium, MediumLazy<unknown>> = {
  game: { CardMediaImage: VgCard, HoverCard: VgHoverCard, elect: vgElect, nowPanel: vgNowPanel },
  show: { CardMediaImage: ShowCard, HoverCard: ShowHoverCard, elect: showElect, nowPanel: showNowPanel },
  movie: { CardMediaImage: MovieCard, HoverCard: MovieHoverCard, elect: movieElect, nowPanel: movieNowPanel },
  book: { CardMediaImage: BookCard, HoverCard: BookHoverCard, elect: bookElect, nowPanel: bookNowPanel },
};
