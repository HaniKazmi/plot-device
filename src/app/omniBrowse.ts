import type { OmniItem } from "../common/medium";
import { MEDIA } from "./media";
import "../utils/arrayUtils";

/**
 * The artwork an item is shown as, which is its own tab's: a season is drawn as its show, since
 * the sheets hold one banner per show and a season has no picture of its own.
 *
 * The browse surfaces are walls of pictures, so an item with none is not on them — the rule
 * `finishedItems` already applies to every domain's library grid.
 */
export const omniBanner = (item: OmniItem): string | undefined => MEDIA[item.medium].banner(item.source);

/**
 * Hours over a set of items, floored once.
 *
 * The single home of the floor, so no surface over the union shows a fraction of an hour and
 * every total is the floor of the sum rather than the sum of the floors — the figure each home tab
 * quotes for the same rows.
 */
export const omniHours = (items: OmniItem[]) => Math.floor(items.sum("hours"));
