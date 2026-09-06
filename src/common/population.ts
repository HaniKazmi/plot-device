import { format } from "../utils/mathUtils";

/**
 * How the app says how much of something there is.
 *
 * One module because the alternative is these three sentences written out at twenty-odd call sites
 * — `${data.length} shows`, `${shown} of ${total}`, a bare `total` — where each is one `format`
 * away from a library of 1,539 reading as "1539" beside a chart that reads "1,539". The wordings
 * are pure strings rather than components: the section header, a rail chip, a button and the
 * search palette's group lines all state them, and each seats them differently.
 */

/**
 * A population with the noun it is counted in: "309 shows".
 *
 * The noun is the caller's, because a shared shell cannot know it is counting seasons — each
 * medium's module carries its own (`noun` in `<domain>/module.ts`).
 */
export const stated = (count: number, noun: string) => `${format(count)} ${noun}`;

/**
 * A list showing part of what it holds: "10 of 1,539", or the whole figure where it holds no more
 * than it shows.
 *
 * Both answers rather than only the first, because every caller asking the question has to answer
 * the other half of it too, and a ternary written at each of them is a `format` each can drop.
 */
export const cut = (shown: number, total: number) =>
  shown < total ? `${format(shown)} of ${format(total)}` : format(total);

/**
 * The cut as the control that undoes it: "All 1,539", worded on the button that opens the rest.
 *
 * A figure a reader can press, rather than a figure beside an icon that means "bigger": what a
 * cut list is missing and the way to it are one thing, so they are one word.
 */
export const all = (total: number) => `All ${format(total)}`;

/**
 * What a population is standing behind: "309 shows · 2 filters", or the figure alone where nothing
 * narrows it.
 *
 * One sentence rather than a figure and a count seated separately, because the two are one claim —
 * this is what is left, and this is how many choices left it — and the surface stating it also
 * carries the Clear that undoes the second half. Singular at one, since "1 filters" beside a
 * carefully formatted figure reads as a string built rather than a sentence written.
 */
export const narrowedTo = (population: string, activeCount: number) =>
  activeCount > 0 ? `${population} · ${activeCount} ${activeCount === 1 ? "filter" : "filters"}` : population;

/**
 * Whether an empty list is the reader's own doing.
 *
 * A library with nothing in it draws no message and offers no Clear — there is no choice to undo.
 * A library some filter has narrowed to zero is a different picture with the same shape, so the
 * two are told apart by the one thing a chart cannot see for itself: whether the page holds any
 * choices at all.
 */
export const isFilteredEmpty = (count: number, activeCount: number): boolean => count === 0 && activeCount > 0;
