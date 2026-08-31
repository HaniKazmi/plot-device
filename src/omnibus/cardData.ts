import type { CardMediaImageProps } from "../common/Card";
import { formatDate } from "../common/date";
import { omniTitle, type OmniItem } from "./adapter";
import { mediumToColour, mediumToLabel } from "./types";

/**
 * The corner badge every mixed-media card wears: the medium, in the fill it is drawn in everywhere
 * else on the page. It is the one thing artwork alone cannot say, and the only vocabulary this tab
 * teaches, so it goes on the picture rather than in a legend beside it.
 */
export const omniMediumChip = (item: OmniItem): CardMediaImageProps["chip"] => ({
  label: mediumToLabel(item.medium),
  colour: mediumToColour(item.medium),
});

/**
 * The strip under a thumbnail: what it is, over when it was finished.
 *
 * Rows read bottom-up, so the date takes the lower line and the full tone — a mixed list is read by
 * when things happened, and the title above it is the context for that.
 */
export const omniLabels = (item: OmniItem): string[][] => [
  [omniTitle(item)],
  [item.closeDate ? formatDate(item.closeDate) : "In progress"],
];
