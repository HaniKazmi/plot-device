import type { ReactNode } from "react";
import type { YearMonthDay } from "../common/date";
import type { TimelineData } from "../common/timelineLayout";
import type { Scheme } from "../utils/types";
import { omniTitle, type OmniItem } from "./adapter";
import { crossingSpan } from "./crossingsData";
import { mediumToColour } from "./types";

/**
 * Every item of the union as one row of the packed timeline, the reading the four tabs' own
 * timelines give one medium at a time.
 *
 * The span is the crossings' own (`crossingSpan`), so the two readings of this section cannot
 * disagree about when an entry ran: a film is a point the chart floors to its minimum bar width,
 * a season or a book its logged dates, a game in play runs to today. A game whose sheet holds a
 * bare year is left out rather than drawn as a year-long bar — the crossings dissolve such a span
 * under a mask that says so, where a packed row of solid bars has no way to mark one as an
 * estimate, and the Games tab's own timeline draws the same line. The colour is the medium's,
 * which is the one vocabulary a mixed row carries meaning in.
 */
export const omniTimeline = (
  items: OmniItem[],
  today: YearMonthDay,
  scheme: Scheme,
  hoverCard: (item: OmniItem) => () => ReactNode,
): TimelineData[] =>
  items
    .map((item) => ({ item, span: crossingSpan(item, item.key, today) }))
    .filter(({ span }) => span.precise)
    .map(({ item, span }) => ({
      // The union's key already tells a replay from its first run and a season from its show.
      key: `${item.medium}-${item.key}`,
      name: omniTitle(item),
      tooltip: hoverCard(item),
      colour: mediumToColour(item.medium, scheme),
      start: span.start,
      end: span.end,
    }));
