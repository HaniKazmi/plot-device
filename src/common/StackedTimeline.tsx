import { Box } from "@mui/material";
import { EventRibbon } from "./EventRibbon";
import { LazyTooltip } from "./LazyTooltip";
import { YearMonth, shortYear, type YearNumber } from "./date";
import { buildTicks, type TimelineData } from "./timelineLayout";
import { yearRows } from "./timelineStripData";
import { useYearCut } from "./useYearCut";

/**
 * Every row is the same 1 January – 31 December, so the months are walked once for all of them —
 * the year is arbitrary as long as it is not a leap year, or every row would carry February a day
 * wide of where its own February falls.
 */
const YEAR_TICKS = buildTicks(YearMonth.get(2001, 1), YearMonth.get(2001, 12), 365);

/**
 * The timeline as a row per year, the whole library on one screen at any width.
 *
 * `yearRows` places each year's spans on the year's own scale, so a span running across New Year
 * stands on both rows with square ends where they were cut, a film being a point on its day, and
 * seasonality reads down the columns. Names are left to the hover card: a year is a phone's width at
 * most, where the packed chart has four viewports to write them in.
 *
 * A year's label is how a reader opens that year: `onYear` scopes the page to it, which is what the
 * rail's own picker would do, and the section then draws that year in detail in the stack's place.
 * A band is how a reader opens its item: pressed, it opens the item's layer through `onOpen`, as a
 * bar on the packed chart does, and puts its hover card away — its card ignores the pointer, as the
 * packed chart's does, so a reader can run along a row through it.
 */
export const StackedTimeline = ({
  data,
  onYear,
  onOpen,
  labelled,
}: {
  data: TimelineData[];
  onYear: (year: YearNumber) => void;
  onOpen: (mark: TimelineData) => void;
  /** Whether a band wears its name where the whole of it fits on the band. */
  labelled?: boolean;
}) => {
  const [limit, cut] = useYearCut();
  const { rows, years } = yearRows(data, limit);
  const cutButton = cut(years);

  return (
    <>
      <EventRibbon
        rows={rows.map((row) => ({
          key: String(row.year),
          label: shortYear(row.year),
          pressLabel: `In ${row.year}`,
          onPress: () => onYear(row.year),
          laneCount: row.laneCount,
          bands: row.bands.map((band) => ({
            key: band.key,
            startPercent: band.startPercent,
            widthPercent: band.widthPercent,
            lane: band.lane,
            colour: band.colour,
            hoverCard: true,
            tooltip: <LazyTooltip render={band.tooltip} />,
            cutStart: band.cutStart,
            cutEnd: band.cutEnd,
            label: labelled ? band.name : undefined,
            onPress: () => onOpen(band),
          })),
        }))}
        ticks={YEAR_TICKS}
      />
      {/* The years held back, as the control that draws them, and once drawn the way back: a stack
          of twenty-five rows is a page of its own. */}
      {cutButton && (
        <Box sx={{ display: "flex", justifyContent: "flex-end", paddingX: 2, paddingBottom: 2 }}>{cutButton}</Box>
      )}
    </>
  );
};
