import type { ReactNode } from "react";
import type { YearMonthDay } from "../common/date";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FranchiseEntry, FranchiseUnion } from "../common/franchiseUnion";
import { bookEntry } from "../books/cardData";
import type { Book } from "../books/types";
import { movieEntry } from "../movie/cardData";
import type { Movie } from "../movie/types";
import { seasonEntry } from "../show/cardData";
import type { Season } from "../show/types";
import { gameEntry } from "../vg/cardData";
import type { VideoGame } from "../vg/types";
import type { OmniItem } from "./adapter";

/** How an item's hover card is built, handed in so this module stays free of anything rendered. */
export type HoverCardOf = (item: OmniItem) => () => ReactNode;

/**
 * An item in the strip's vocabulary, through the mapper its own domain draws with — so the union
 * and a tab's own index cannot draw one item two ways. `medium` is the discriminant, because
 * `source` is a union of four records TypeScript cannot narrow on shape and the item already says
 * which one it holds.
 */
const unionEntry = (item: OmniItem, today: YearMonthDay, hoverCard: HoverCardOf): FranchiseEntry => {
  switch (item.medium) {
    case "game":
      return gameEntry(item.source as VideoGame, today, hoverCard(item));
    case "show":
      return seasonEntry(item.source as Season, today, hoverCard(item));
    case "movie":
      return movieEntry(item.source as Movie, hoverCard(item));
    case "book":
      return bookEntry(item.source as Book, today, hoverCard(item));
  }
};

/**
 * Every franchise across the four libraries, grouped on the raw franchise column exactly as each
 * domain's own index groups — a series' founding entry keeps naming itself, and a standalone work
 * is a group of one that every consumer tests for. A film and a game sharing one title are the
 * cross-medium fact a card exists to show, which is why the crossings' rule of dropping a group
 * whose every entry repeats the name is not applied here: that rule chooses which franchises a
 * section draws at all, and a card has already chosen.
 */
export const buildFranchiseUnion = (items: OmniItem[], today: YearMonthDay, hoverCard: HoverCardOf): FranchiseUnion =>
  franchiseIndex(
    items.map((item) => unionEntry(item, today, hoverCard)),
    (entry) => entry.franchise,
  );
