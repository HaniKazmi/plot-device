import type { ReactNode } from "react";
import { Year, type YearMonthDay } from "../common/date";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FranchiseEntry, FranchiseUnion } from "../common/franchiseUnion";
import { mediumFills } from "../utils/types";
import type { Book } from "../books/types";
import type { Movie } from "../movie/types";
import { showSubject } from "../show/cardData";
import type { Season } from "../show/types";
import type { VideoGame } from "../vg/types";
import { toOmniItems, type Library, type OmniItem } from "./adapter";

/** How an item's hover card is built, handed in so this module stays free of anything rendered. */
export type HoverCardOf = (item: OmniItem) => () => ReactNode;

/**
 * The span an item occupies, and what identifies it on a strip.
 *
 * `medium` is the discriminant, because `source` is a union of four records TypeScript cannot
 * narrow on shape and the item already says which one it holds. A film is a point — `start ===
 * end` — which the strip draws as a dot rather than a floored bar. A year-only game spans the
 * whole of its year with imprecise edges: the estimate a game's own tab shares a year out with
 * needs the whole library to divide it between, and a franchise holds two or three entries of it.
 */
const unionEntry = (item: OmniItem, today: YearMonthDay, hoverCard: HoverCardOf): FranchiseEntry => {
  const base = {
    key: item.key,
    subject: item.key,
    franchise: item.franchise,
    medium: item.medium,
    fill: mediumFills[item.medium],
    label: item.name,
    precise: true,
    hoverCard: hoverCard(item),
  };

  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return {
        ...base,
        start: game.startDate.firstDay(),
        // Still being played, whatever precision the start carries.
        end: game.endDate ? game.endDate.lastDay() : today,
        precise: !(game.startDate instanceof Year) && !(game.endDate instanceof Year),
      };
    }
    case "show": {
      const season = item.source as Season;
      return {
        ...base,
        subject: showSubject(season.show),
        label: `${season.show.name} S${season.s}`,
        start: season.startDate,
        end: season.endDate ?? today,
      };
    }
    case "movie": {
      const movie = item.source as Movie;
      return { ...base, start: movie.startDate, end: movie.startDate };
    }
    case "book": {
      const book = item.source as Book;
      return { ...base, start: book.startDate, end: book.endDate ?? today };
    }
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
export const buildFranchiseUnion = (library: Library, today: YearMonthDay, hoverCard: HoverCardOf): FranchiseUnion =>
  franchiseIndex(
    toOmniItems(library).map((item) => unionEntry(item, today, hoverCard)),
    (entry) => entry.franchise,
  );
