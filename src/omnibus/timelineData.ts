import type { ReactNode } from "react";
import type { YearMonthDay } from "../common/date";
import { groupMarks, type PicturePress, type TimelineData } from "../common/timelineLayout";
import type { Colour } from "../utils/types";
import { omniTitle } from "./adapter";
import type { OmniItem } from "../common/medium";
import { crossingSpan } from "./crossingsData";

/** How one mark of the union is drawn: its colour, its hover card and its picture. */
interface MarkDrawing {
  colourOf: (item: OmniItem) => Colour;
  hoverCard: (item: OmniItem) => () => ReactNode;
  picture: (item: OmniItem) => (height: number, press: PicturePress) => ReactNode;
}

/**
 * One item of the union as a mark of the timeline.
 *
 * The span is the crossings' own (`crossingSpan`), so the two sections cannot disagree about when an
 * entry ran: a film is a point, a season or a book its logged dates, a game in play runs to today,
 * and an entry with no close is still going.
 */
const omniMark = (item: OmniItem, today: YearMonthDay, drawing: MarkDrawing): TimelineData => {
  const { start, end } = crossingSpan(item, item.key, today);
  return {
    // The union's key already tells a replay from its first run and a season from its show.
    key: `${item.medium}-${item.key}`,
    name: omniTitle(item),
    tooltip: drawing.hoverCard(item),
    colour: drawing.colourOf(item),
    start,
    end,
    open: !item.closeDate,
    picture: drawing.picture(item),
  };
};

/** Every item of the union as one mark, the reading the four tabs' own timelines give one medium at a time. */
export const omniTimeline = (items: OmniItem[], today: YearMonthDay, drawing: MarkDrawing): TimelineData[] =>
  items.map((item) => omniMark(item, today, drawing));

/**
 * Every franchise of the union as one span, across whichever media it was met in (`groupMarks`).
 *
 * Grouped on the raw franchise column, as the crossings are, so a work naming itself is a franchise
 * of its own entries — a show's seasons one span — and a series met in two media is one span across
 * both.
 */
export const omniFranchiseTimeline = (items: OmniItem[], today: YearMonthDay, drawing: MarkDrawing): TimelineData[] =>
  groupMarks(
    items,
    (item) => omniMark(item, today, drawing),
    (item) => item.franchise,
  ).map(({ mark }) => mark);

/**
 * The line an item stands on inside its franchise: its own medium's series, a season's being its
 * show. Keyed by medium as well as name, since a series never joins across media however it is
 * called. A standalone answers `""`, which `groupMarks` leaves a mark of its own.
 */
export const lineOf = (item: OmniItem): string => (item.series ? `${item.medium}:${item.series}` : "");

/** Every series of a set of items as one span, and every standalone work as its own mark. */
export const omniSeriesTimeline = (items: OmniItem[], today: YearMonthDay, drawing: MarkDrawing): TimelineData[] =>
  groupMarks(items, (item) => omniMark(item, today, drawing), lineOf).map(({ mark }) => mark);
