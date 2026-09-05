import * as bookLazy from "../books/module.lazy";
import type { MediumLazy } from "../common/medium";
import * as movieLazy from "../movie/module.lazy";
import * as showLazy from "../show/module.lazy";
import type { Medium } from "../utils/types";
import * as vgLazy from "../vg/module.lazy";

/**
 * The four media's components, as one lookup — `MEDIA`'s other half.
 *
 * Reached statically rather than through each module's own `load()`, because the surface that
 * needs it is a wall of cards: a `lazy()` per medium turns four chunks that arrive *with* the
 * chunk dispatching to them into four round trips after it, and the wall paints blank for the
 * length of them. Nothing eager imports this file, so the four stay out of the first bundle all
 * the same; `load()` is for a caller that can wait for one.
 */
export const MEDIA_LAZY: Record<Medium, MediumLazy<unknown>> = {
  game: vgLazy,
  show: showLazy,
  movie: movieLazy,
  book: bookLazy,
};
