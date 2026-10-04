import { Box, ButtonBase, CardContent, Typography, useTheme } from "@mui/material";
import { Fragment } from "react";
import type { ArtworkShape } from "./cardArrangement";
import { shortYear, type YearNumber } from "./date";
import { byDate } from "./finishedData";
import { clockLayout, FOLD_WIDTH, foldLabel, type ClockFold } from "./pictureClockData";
import { ScrollFade } from "./ScrollFade";
import { CHART_MAX_HEIGHT, CONTAIN_SIDEWAYS_SCROLL, scrollbarSx } from "./scrollbarSx";
import type { TimelineData } from "./timelineLayout";
import { PictureMark } from "./YearDetail";
import { useElementWidth } from "./useElementWidth";
import { useCoarsePointer } from "./useCoarsePointer";
import { useOpenAtLatest } from "./useOpenAtLatest";
import { useScrollEdges } from "./useScrollEdges";
import { focusRingSx, NUMERIC_LABEL_SX } from "./typography";

/** The room a picture's line and a gap take beneath it. */
const LINE_ROOM = 14;
/** The narrowest column a whole year is written in; narrower, it is its last two digits. */
const FULL_YEAR_WIDTH = 44;
/** The narrowest column that holds a year's last two digits; narrower, only every other year is named. */
const SHORT_YEAR_WIDTH = 22;
/** The year labels beneath the columns. */
const AXIS_HEIGHT = 24;

/** The stripe a fold is drawn in, solved against the theme's own rule colour. */
const FOLD_SX = {
  position: "absolute",
  top: 0,
  backgroundImage: (theme: { palette: { divider: string } }) =>
    `repeating-linear-gradient(135deg, transparent 0 5px, ${theme.palette.divider} 5px 6px)`,
} as const;

const LABEL_SX = { ...NUMERIC_LABEL_SX, position: "absolute", top: 2, paddingX: 0.5, borderRadius: 1 } as const;

/**
 * The axis, pinned to the foot of the clock's own scroller: a library's clock runs to dozens of
 * lanes and scrolls inside its card from `md` up, and a year read off a picture half a screen above
 * the labels is a year the reader has to scroll to find.
 */
const AXIS_SX = {
  position: "sticky",
  bottom: 0,
  height: AXIS_HEIGHT,
  backgroundColor: "background.paper",
  zIndex: 1,
} as const;

/** A year's column or a fold's, behind the pictures. */
const ClockColumn = ({
  x,
  width,
  height,
  background,
}: {
  x: number;
  width: number;
  height: number;
  background?: string;
}) => (
  <Box
    sx={{ position: "absolute", top: 0, borderLeft: 1, borderColor: "divider", backgroundColor: background }}
    style={{ left: x, width, height }}
  />
);

/** A column's label on the axis — a press scoping the page to the year, where given. */
const ClockLabel = ({
  x,
  label,
  muted,
  year,
  onYear,
}: {
  x: number;
  label: string;
  muted?: boolean;
  year?: YearNumber;
  onYear?: (year: YearNumber) => void;
}) => {
  if (!label) return null;
  const text = (
    <Typography
      variant="caption"
      sx={{ fontWeight: muted ? 400 : 600, color: muted ? "text.secondary" : undefined, ...NUMERIC_LABEL_SX }}
    >
      {label}
    </Typography>
  );
  return year !== undefined && onYear ? (
    <ButtonBase
      onClick={() => onYear(year)}
      aria-label={`In ${year}`}
      sx={(theme) => ({ ...LABEL_SX, ...focusRingSx(theme) })}
      style={{ left: x }}
    >
      {text}
    </ButtonBase>
  ) : (
    <Box
      sx={LABEL_SX}
      style={{ left: x }}
    >
      {text}
    </Box>
  );
};

/**
 * A set of marks as their own artwork on their own clock: each picture standing at the day its item
 * began, a line beneath it running to the day it ended, over every year any of them touches — and
 * the runs of years none of them touches folded to a narrow stripe (`clockScale`).
 *
 * `YearPictures` is the same reading for one year, drawn by the same mark (`PictureMark`); this is
 * it across every year a set runs over. A franchise's few pictures fit the card; a tab's hundreds
 * widen the clock up to the packed chart's own width (`clockLayout`), scrolled sideways and opened
 * at its latest end as that chart is. Pictures take lanes by the packed chart's rule in pixels
 * (`pictureLanes`), a lane held until both a picture and its line have ended, and a picture opens
 * its mark's item through `onOpen`, as a bar does. A year's label scopes the page to it through
 * `onYear`, as Stacked's and the grid's do.
 */
export const PictureClock = ({
  data,
  shape,
  onOpen,
  onYear,
}: {
  data: TimelineData[];
  shape: ArtworkShape;
  onOpen: (mark: TimelineData) => void;
  onYear?: (year: YearNumber) => void;
}) => {
  const theme = useTheme();
  const [frameRef, measured] = useElementWidth<HTMLDivElement>();
  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const coarse = useCoarsePointer();
  // The card's width once measured; before it is, a guess that only decides the first frame's lanes.
  const cardWidth = measured || 900;

  const items = data.toSorted((a, b) => byDate(a.start, b.start));
  const { width, scale, pictureHeight, lefts, lanes, laneCount, spans } = clockLayout(items, cardWidth, shape);
  // Asked once the card is measured: opened at the guessed width, the scroll would stop short of
  // the latest end by however much the measured clock outgrew the guess.
  useOpenAtLatest(scrollRef, measured !== undefined && width > cardWidth);
  const row = pictureHeight + LINE_ROOM;
  const height = laneCount * row;
  const yearWidth = scale.years[0]?.width ?? 0;
  // A label wider than its column runs over its neighbour's. Years squeezed by many folds on a
  // phone name every other one, or every third, so each label has the unnamed columns beside it to
  // run into; a fold narrowed below what its label needs goes unnamed, its stripe saying it is a gap.
  const stride = Math.ceil(SHORT_YEAR_WIDTH / Math.max(yearWidth, 1));
  const yearLabel = (year: number, index: number) =>
    yearWidth >= FULL_YEAR_WIDTH ? String(year) : index % stride === 0 ? shortYear(year) : "";
  const foldFits = (fold: ClockFold) => fold.width >= (fold.from === fold.to ? SHORT_YEAR_WIDTH : FOLD_WIDTH);

  return (
    <CardContent>
      <Box ref={frameRef}>
        <ScrollFade
          edges={edges}
          ground={theme.vars.palette.background.paper}
        >
          <Box
            ref={scrollRef}
            sx={{ overflow: "auto", maxHeight: CHART_MAX_HEIGHT, ...CONTAIN_SIDEWAYS_SCROLL, ...scrollbarSx(theme) }}
          >
            <Box style={{ width }}>
              <Box
                sx={{ position: "relative" }}
                style={{ height }}
              >
                {scale.years.map(({ year, x, width: columnWidth }, index) => (
                  <ClockColumn
                    key={year}
                    x={x}
                    width={columnWidth}
                    height={height}
                    background={index % 2 ? "action.hover" : undefined}
                  />
                ))}
                {scale.folds.map((fold) => (
                  <Fragment key={fold.from}>
                    <ClockColumn
                      x={fold.x}
                      width={fold.width}
                      height={height}
                    />
                    <Box
                      sx={FOLD_SX}
                      style={{ left: fold.x, width: fold.width, height }}
                    />
                  </Fragment>
                ))}
                {items.map((item, index) => (
                  <PictureMark
                    key={item.key}
                    item={item}
                    coarse={coarse}
                    left={lefts[index]}
                    top={lanes[index] * row}
                    height={pictureHeight}
                    lineStart={spans[index].lineStart}
                    lineEnd={spans[index].lineEnd}
                    onOpen={onOpen}
                  />
                ))}
              </Box>
              <Box sx={AXIS_SX}>
                {scale.years.map(({ year, x }, index) => (
                  <ClockLabel
                    key={year}
                    x={x}
                    label={yearLabel(year, index)}
                    year={year as YearNumber}
                    onYear={onYear}
                  />
                ))}
                {scale.folds.map((fold) => (
                  <ClockLabel
                    key={fold.from}
                    x={fold.x}
                    label={foldFits(fold) ? foldLabel(fold) : ""}
                    muted
                  />
                ))}
              </Box>
            </Box>
          </Box>
        </ScrollFade>
      </Box>
    </CardContent>
  );
};
