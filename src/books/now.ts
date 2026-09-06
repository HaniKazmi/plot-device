import { CURRENT_PLAINDATE, formatDate } from "../common/date";
import type { NowModule, NowPanel } from "../common/medium";
import type { Scheme } from "../utils/types";
import { bookSubtitle } from "./cardData";
import { bookHeroStats, currentlyReading } from "./statsData";
import type { Book } from "./types";

/** The book in hand, most recently begun — the tab's own hero. */
const elect = (books: Book[]) => currentlyReading(books)[0];

const nowPanel = (book: Book, scheme: Scheme): NowPanel => ({
  kicker: `Since ${formatDate(book.startDate)}`,
  date: formatDate(book.startDate),
  title: book.name,
  subtitle: bookSubtitle(book, scheme),
  // Two tiles, as the show card beside it carries: the column beside a cover holds two and wraps a
  // third under them, and the rest stay on the Books tab's own hero.
  stats: bookHeroStats(book, CURRENT_PLAINDATE, "card"),
});

/**
 * This medium's Now band answers, stated as one typed pair so the election and the panel are
 * checked against the same record here, where `MediumLazy` erases it. Pure, so a test can run the
 * pair as the band runs it, without the card tree `module.lazy.ts` also carries.
 */
export const now: NowModule<Book> = { elect, nowPanel };
