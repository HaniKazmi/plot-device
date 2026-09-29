import type { ReactElement } from "react";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { LazyTooltip } from "./LazyTooltip";
import type { TimelineData } from "./timelineLayout";

/**
 * A timeline mark drawn as its own picture, with the hover card every other reading of the same
 * mark shows: a picture on the month grid or on a year's line answers the pointer as its bar does on
 * Across and Stacked, so the three layouts are one chart to the hand as well as to the eye.
 *
 * `transparent`, as the packed chart's marks are: pictures stand a few pixels apart and the card is
 * 500px wide, so a card taking the pointer would cover the next several a reader is running along
 * to. The picture keeps the press, which opens what the card would have — the mark's own item, or
 * the series a series' first cover fronts — through the press the layout hands every picture
 * (`PicturePress`). Under a coarse pointer there is no hovering, and the picture is left as it is: a
 * tap on it opens that same layer directly, where a sheet in between would be a second tap to reach
 * what the picture already is.
 */
export const PictureHover = ({
  mark,
  coarse,
  children,
}: {
  mark: TimelineData;
  /** Read once by the caller, which draws many of these. */
  coarse: boolean;
  children: ReactElement<{ onClick?: () => void }>;
}) =>
  coarse ? (
    children
  ) : (
    <HoverCardTooltip
      colour={mark.colour}
      title={<LazyTooltip render={mark.tooltip} />}
      name={mark.name}
      coarse={false}
      transparent
    >
      {children}
    </HoverCardTooltip>
  );
