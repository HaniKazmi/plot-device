import { Box, CardContent, Typography } from "@mui/material";
import { Fragment } from "react";
import { shapeRatioValues, type ArtworkShape } from "./cardArrangement";
import { shortYear } from "./date";
import { byDate } from "./finishedData";
import { clockScale, foldLabel } from "./pictureClockData";
import type { TimelineData } from "./timelineLayout";
import { pictureLanes } from "./yearDetailData";
import { PictureMark } from "./YearDetail";
import { useElementWidth } from "./useElementWidth";
import { useCoarsePointer } from "./useCoarsePointer";
import { NUMERIC_LABEL_SX } from "./typography";

/**
 * How tall a picture stands, largest first: the clock takes the first at which its pictures fit in
 * `MOST_LANES`, and the smallest where none does. A burst of six films in a year is six lanes at a
 * size a sparse franchise reads well at, and four at the next size down.
 */
const PICTURE_HEIGHTS = [64, 48, 36] as const;
const MOST_LANES = 4;
/** The room a picture's line and a gap take beneath it. */
const LINE_ROOM = 14;
/** Clear space after a picture before the next may stand in its lane. */
const PICTURE_GAP = 6;
/** The width a run of empty years folds to. */
const FOLD_WIDTH = 44;
/** The narrowest column a whole year is written in; narrower, it is its last two digits. */
const FULL_YEAR_WIDTH = 44;
/** The year labels beneath the columns. */
const AXIS_HEIGHT = 22;

/** The stripe a fold is drawn in, solved against the theme's own rule colour. */
const FOLD_SX = {
  position: "absolute",
  top: 0,
  backgroundImage: (theme: { palette: { divider: string } }) =>
    `repeating-linear-gradient(135deg, transparent 0 5px, ${theme.palette.divider} 5px 6px)`,
} as const;

/** A column of the clock or a fold, and the label beneath it. */
const ClockColumn = ({
  x,
  width,
  height,
  background,
  label,
  muted,
}: {
  x: number;
  width: number;
  height: number;
  background?: string;
  label: string;
  muted?: boolean;
}) => (
  <>
    <Box
      sx={{ position: "absolute", top: 0, borderLeft: 1, borderColor: "divider", backgroundColor: background }}
      style={{ left: x, width, height }}
    />
    <Typography
      variant="caption"
      sx={{
        ...NUMERIC_LABEL_SX,
        position: "absolute",
        paddingLeft: 0.5,
        fontWeight: muted ? 400 : 600,
        color: muted ? "text.secondary" : undefined,
      }}
      style={{ left: x, top: height + 2 }}
    >
      {label}
    </Typography>
  </>
);

/**
 * A set of marks as their own artwork on their own clock: each picture standing at the day its item
 * began, a line beneath it running to the day it ended, over every year any of them touches — and
 * the runs of years none of them touches folded to a narrow stripe (`clockScale`).
 *
 * `YearPictures` is the same reading for one year, drawn by the same mark (`PictureMark`); this is
 * it across a set of items small enough that every one of them can be a picture, a franchise rather
 * than a library. Pictures take lanes by the packed chart's rule in pixels (`pictureLanes`), a lane
 * held until both a picture and its line have ended, and a picture opens its mark's item through
 * `onOpen`, as a bar does.
 */
export const PictureClock = ({
  data,
  shape,
  onOpen,
}: {
  data: TimelineData[];
  shape: ArtworkShape;
  onOpen: (mark: TimelineData) => void;
}) => {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  const coarse = useCoarsePointer();
  // The card's width once measured; before it is, a guess that only decides the first frame's lanes.
  const width = measured || 900;

  const items = data.toSorted((a, b) => byDate(a.start, b.start));
  const scale = clockScale(items, width, FOLD_WIDTH);
  // Where each line runs is the same at every picture size; only where a picture can stand moves.
  const spans = items.map((item) => ({ lineStart: scale.xAt(item.start), lineEnd: scale.xAt(item.end) }));
  const layoutAt = (pictureHeight: number) => {
    const pictureWidth = pictureHeight * shapeRatioValues[shape];
    // Held inside the card for an item begun at the clock's right edge, its line still starting
    // where the item did; packed from where the picture is drawn, so it cannot land on the one
    // before it in the same lane.
    const lefts = spans.map(({ lineStart }) => Math.min(lineStart, width - pictureWidth));
    const { lanes, laneCount } = pictureLanes(
      spans.map(({ lineEnd }, index) => ({ x0: lefts[index], x1: lineEnd, width: pictureWidth })),
      PICTURE_GAP,
    );
    return { pictureHeight, lefts, lanes, laneCount };
  };
  // The largest size that fits, trying the next only where the last did not.
  let layout = layoutAt(PICTURE_HEIGHTS[0]);
  for (const size of PICTURE_HEIGHTS.slice(1)) {
    if (layout.laneCount <= MOST_LANES) break;
    layout = layoutAt(size);
  }
  const { pictureHeight, lefts, lanes, laneCount } = layout;
  const row = pictureHeight + LINE_ROOM;
  const height = laneCount * row;
  const fullYears = (scale.years[0]?.width ?? 0) >= FULL_YEAR_WIDTH;

  return (
    <CardContent>
      <Box
        ref={ref}
        sx={{ position: "relative" }}
        style={{ height: height + AXIS_HEIGHT }}
      >
        {scale.years.map(({ year, x, width: columnWidth }, index) => (
          <ClockColumn
            key={year}
            x={x}
            width={columnWidth}
            height={height}
            background={index % 2 ? "action.hover" : undefined}
            label={fullYears ? String(year) : shortYear(year)}
          />
        ))}
        {scale.folds.map((fold) => (
          <Fragment key={fold.from}>
            <ClockColumn
              x={fold.x}
              width={fold.width}
              height={height}
              label={foldLabel(fold)}
              muted
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
    </CardContent>
  );
};
