import type { ReactNode } from "react";
import type { YearMonthDay } from "../common/date";
import { franchiseIndex } from "../common/franchiseIndex";
import type { FranchiseEntry, FranchiseUnion } from "../common/franchiseUnion";
import { moduleOf } from "./media";
import type { OmniItem } from "../common/medium";

/** How an item's hover card is built, handed in so this module stays free of anything rendered. */
export type HoverCardOf = (item: OmniItem) => () => ReactNode;

/**
 * An item in the strip's vocabulary, through the mapper its own domain draws with — so the union
 * and a tab's own index cannot draw one item two ways.
 */
const unionEntry = (item: OmniItem, today: YearMonthDay, hoverCard: HoverCardOf): FranchiseEntry =>
  moduleOf(item).entry(item.source, today, hoverCard(item));

/**
 * Every franchise across the four libraries, grouped on the raw franchise column exactly as each
 * domain's own index groups — a series' founding entry keeps naming itself, and a standalone work
 * is a franchise of one, which a card's strip draws nothing for, there being nothing to place the
 * work among. A film and a game sharing one title are the cross-medium fact a card exists to show.
 */
export const buildFranchiseUnion = (items: OmniItem[], today: YearMonthDay, hoverCard: HoverCardOf): FranchiseUnion =>
  franchiseIndex(
    items.map((item) => unionEntry(item, today, hoverCard)),
    (entry) => entry.franchise,
  );
