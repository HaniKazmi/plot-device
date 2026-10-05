import { Button, Card, CardContent, Stack } from "@mui/material";
import { ChevronLeft, Timeline as TimelineIcon } from "@mui/icons-material";
import { useState, type ReactNode } from "react";
import { ColourKey } from "./ColourKey";
import { NothingMatches, NothingToPlot } from "./NothingMatches";
import { useNothingMatches } from "./nothingMatchesContext";
import { SectionHeader } from "./SectionHeader";
import { SegmentedControl, type YearDispatch } from "./SelectionComponents";
import { segments } from "./segments";
import { StackedTimeline } from "./StackedTimeline";
import { MonthGrid } from "./MonthGrid";
import { TimeLineChart } from "./Timeline";
import { YearLog, YearPictures } from "./YearDetail";
import { PictureClock } from "./PictureClock";
import { useOpenedCard } from "./useOpenedCard";
import { usePhone } from "./breakpoints";
import { KIT_OUTLINED_SX } from "./typography";
import type { ArtworkShape } from "./cardArrangement";
import type { YearType } from "./filterReducer";
import { CURRENT_PLAINDATE, CURRENT_YEAR, YearMonthDay, type YearNumber } from "./date";
import type { TimelineData } from "./timelineLayout";

/**
 * The ways a timeline is laid out. `Across` is time running left to right over four screens,
 * every bar named, the way a single playthrough is read; `Stacked` is a row per year on one screen,
 * the way a library's shape across years is compared; `Grid` is that same row per year cut into
 * months, each item's own picture standing in the month it began — Stacked read by what rather
 * than how long; `Pictures` is Across read by what: every item's picture on the line at the day it
 * began, on a clock of its own years with the empty runs folded.
 */
export type TimelineLayout = "Across" | "Stacked" | "Grid" | "Pictures";

/** One order on every timeline, so a layout is the same segment wherever it is pressed. */
const LAYOUTS: readonly TimelineLayout[] = ["Across", "Stacked", "Grid", "Pictures"];

/**
 * A tab's timeline: one set of marks drawn in whichever of the four layouts the tab offers, coloured
 * by the Colour picker that leads the key naming those colours.
 *
 * The caller owns what the marks are — which items, one per item or per series, in which colours —
 * and hands them in as `TimelineData`; the section owns how they are laid out, which is the same
 * question on every tab. It opens on the first layout the tab offers, or the one the caller names,
 * and the choice is held for the visit.
 * A pressed mark — a bar, a band or a picture, on whichever layout — opens its item through the one
 * host the section keeps (`useOpenedCard`), so a press means the same thing on all five.
 *
 * The page's year scope reads through. Scoped to a year, Across is drawn at the card's width rather
 * than four screens wide, and Pictures opens the year in detail: its items as pictures on the line
 * across the year's own January to December from `sm` up, and as the log on a phone, where the
 * year's own scale is a few pixels a day and the names have to be read down the page — the same
 * reading as the clock, its pictures on the line, at the scale of one year. A year's label on
 * Stacked, the grid or the clock scopes the page to it through the tab's own `dispatch` — the one
 * action the rail's own picker sends — and "All years" beside the layout is the way back.
 *
 * Like the packed chart it grew from, it never folds on a phone: a folded card would show a picture
 * of the chart's shape, no cheaper a reading than the rows themselves, and Stacked is built to fit
 * a phone's width.
 */
export const TimelineSection = ({
  title,
  count,
  data,
  controls,
  colourKey,
  yearType,
  yearTo,
  dispatch,
  shape,
  stacked,
  layouts,
  initialLayout,
}: {
  title: string;
  count?: string;
  data: TimelineData[];
  /** The caller's own controls about the marks — its one mark per — drawn before the layout. */
  controls?: ReactNode;
  /** What the colours mean: the field's name and a swatch and word per value drawn. */
  colourKey?: { field: string; entries: readonly { value: string; colour: string }[]; control?: ReactNode };
  yearType: YearType;
  yearTo: YearNumber;
  /** The tab's own store, which a year's label and the way back set the page's scope through. */
  dispatch: YearDispatch;
  /** The shape of the tab's artwork, which a year drawn in pictures lays its lanes out by. */
  shape: ArtworkShape;
  /**
   * How the stack of years differs from Across, where a tab asks it to: the marks its rows draw and
   * the figure its header states for them, and whether a band wears its name where the name fits.
   * A tab reading a year as one row leaves out what would open a second lane in every year it ran.
   */
  stacked?: { data?: TimelineData[]; count?: string; labelled?: boolean };
  /**
   * The layouts this timeline offers, all four where nothing says otherwise. Drawn in the one order
   * whatever order they are given in, so a tab leaving one out moves none of the others.
   */
  layouts?: readonly TimelineLayout[];
  /** The layout the section opens on, the first it offers where nothing says otherwise. */
  initialLayout?: TimelineLayout;
}) => {
  const offered = layouts ? LAYOUTS.filter((each) => layouts.includes(each)) : LAYOUTS;
  // The caller's opening layout only where the tab offers it, or the section would open on a layout
  // with no lit segment and no way back to it.
  const [layout, setLayout] = useState<TimelineLayout>(
    initialLayout && offered.includes(initialLayout) ? initialLayout : offered[0],
  );
  const [open, openedCard] = useOpenedCard();
  const { active } = useNothingMatches();
  const scopeTo = (year: YearNumber) => dispatch({ type: "scope", yearTo: year, yearType: "matching" });
  // Which of the year's two detailed views is drawn is a question of which tree, so it is read as
  // a value: the log and the pictures are different components, not one styled two ways.
  const phone = usePhone();
  const inYear = yearType === "matching";
  // The year in detail runs to today where the year is the current one, and a log or a line of
  // pictures past today would be months of nothing.
  const from = YearMonthDay.get(yearTo, 1, 1);
  const yearEnd = YearMonthDay.get(yearTo, 12, 31);
  const to = CURRENT_PLAINDATE < yearEnd ? CURRENT_PLAINDATE : yearEnd;

  return (
    <Card>
      <SectionHeader
        icon={<TimelineIcon />}
        title={title}
        count={layout === "Stacked" && !inYear && stacked?.count !== undefined ? stacked.count : count}
        action={
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center" }}
          >
            {inYear && (
              <Button
                size="small"
                variant="outlined"
                startIcon={<ChevronLeft />}
                onClick={() => dispatch({ type: "scope", yearTo: CURRENT_YEAR, yearType: "upto" })}
                sx={KIT_OUTLINED_SX}
              >
                All years
              </Button>
            )}
            {controls}
            <SegmentedControl
              options={segments(offered)}
              value={layout}
              onChange={setLayout}
              ariaLabel="Layout"
            />
          </Stack>
        }
      />
      {/* The Colour picker leads its own key rather than standing in the header: the key is
          where a reader asks what the colours mean, and the header holds what the marks are and
          how they are laid out. Drawn with no entries too, while it carries the picker, so a
          vocabulary answering nothing — a book under certificate — leaves the way back. */}
      {colourKey && (colourKey.entries.length > 0 || colourKey.control) && (
        <ColourKey
          field={colourKey.field}
          entries={colourKey.entries}
          control={colourKey.control}
        />
      )}
      {data.length === 0 ? (
        // Which of the two lines is the page's answer: the page emptied says so and offers the way
        // back, and a chart emptied by a rule of its own states that it has nothing.
        <CardContent>{active ? <NothingMatches /> : <NothingToPlot />}</CardContent>
      ) : layout === "Pictures" && inYear && phone ? (
        <YearLog
          data={data}
          from={from}
          to={to}
          onOpen={open}
        />
      ) : layout === "Pictures" && inYear ? (
        <YearPictures
          data={data}
          from={from}
          to={to}
          shape={shape}
          onOpen={open}
        />
      ) : layout === "Pictures" ? (
        <PictureClock
          data={data}
          shape={shape}
          onOpen={open}
          onYear={scopeTo}
        />
      ) : layout === "Grid" ? (
        // Every mark, a web serial included: a picture stands in the month it began and opens no
        // second lane, so nothing the stack leaves out for its lanes' sake is left out here.
        <MonthGrid
          data={data}
          onYear={scopeTo}
          onOpen={open}
        />
      ) : layout === "Across" ? (
        <CardContent>
          <TimeLineChart
            timelineData={data}
            fit={inYear}
            onOpen={open}
          />
        </CardContent>
      ) : (
        <StackedTimeline
          data={stacked?.data ?? data}
          onYear={scopeTo}
          onOpen={open}
          labelled={stacked?.labelled}
        />
      )}
      {openedCard}
    </Card>
  );
};
