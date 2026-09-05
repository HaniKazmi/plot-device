import { formatDate } from "../common/date";
import { omniTitle } from "./adapter";
import type { OmniItem } from "../common/medium";

/**
 * The strip under a thumbnail: when it was finished, over what it was.
 *
 * Rows read bottom-up, so the closing row takes the full tone and the rows above it are the context
 * that row belongs to. Every other caller puts a date there and its figures below; this one is a
 * mixed list of works, so what belongs on the closing line is the name — a card whose title is the
 * dimmer of its two lines reads as a date with a caption. The date above it is then the kicker the
 * hero and the Now band already state a date as.
 */
export const omniLabels = (item: OmniItem): string[][] => [
  [item.closeDate ? formatDate(item.closeDate) : "In progress"],
  [omniTitle(item)],
];
