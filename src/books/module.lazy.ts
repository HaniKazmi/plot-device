import type { Book } from "./types";

/** The Books half a browse surface reaches for. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, BookHoverCard as HoverCard } from "./CardMediaImage";

/** Title and release, as a film's work is: a reread joins the first reading. */
export const work = (book: Book): unknown => `${book.name}-${book.releaseDate}`;

export const secondaryText = (book: Book) => [book.author, book.series];

export const facts = (book: Book) =>
  [book.author, book.status, book.pages ? `${book.pages} pages` : ""].filter(Boolean).join(" · ");
