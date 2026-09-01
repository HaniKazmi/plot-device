import type { CardMediaImageProps } from "../common/Card";
import { formatDate } from "../common/date";
import { omniTitle, type OmniItem } from "./adapter";
import { mediumToColour, mediumToLabel } from "./types";
import type { Scheme } from "../utils/types";

/**
 * The corner badge every mixed-media card wears: the medium, in the fill it is drawn in everywhere
 * else on the page. It is the one thing artwork alone cannot say, and the only vocabulary this tab
 * teaches, so it goes on the picture rather than in a legend beside it.
 */
export const omniMediumChip = (item: OmniItem, scheme: Scheme): CardMediaImageProps["chip"] => ({
  label: mediumToLabel(item.medium),
  colour: mediumToColour(item.medium, scheme),
});

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
