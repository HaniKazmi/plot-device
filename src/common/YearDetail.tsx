import { Box, CardContent, Stack, Typography } from "@mui/material";
import { YearMonth, formatDateRange, type YearMonthDay } from "./date";
import { shapeRatioValues, type ArtworkShape } from "./cardArrangement";
import { TimelineAxis, TimelineScale } from "./TimelineBand";
import { buildTicks, percentAtDate, percentOfSpan, type TimelineData } from "./timelineLayout";
import { pictureLanes, yearLog } from "./yearDetailData";
import { useElementWidth } from "./useElementWidth";
import { useCoarsePointer } from "./useCoarsePointer";
import { PictureHover } from "./PictureHover";
import { MUTED_FIGURE_SX, NUMERIC_LABEL_SX } from "./typography";
import { format } from "../utils/mathUtils";

/** Whether a mark falls anywhere inside the window, which is all either view draws. */
const inWindow = (item: TimelineData, from: YearMonthDay, to: YearMonthDay) =>
  item.start.lte(item.end) && item.start.lte(to) && from.lte(item.end);

/** A date held inside the window, for a mark that began before it or runs on past it. */
const clampTo = (date: YearMonthDay, from: YearMonthDay, to: YearMonthDay) =>
  date < from ? from : to < date ? to : date;

/** How tall a picture on the line stands, and the room beneath it its line and a gap take. */
const PICTURE_HEIGHT = 72;
const PICTURE_ROW = PICTURE_HEIGHT + 14;
/** The month labels above the first lane. */
const AXIS_ROOM = 20;
/** Clear space after a picture before the next may stand in its lane. */
const PICTURE_GAP = 8;

/**
 * A year as its own artwork: each item's picture standing at the day it began, a line beneath it
 * running to the day it ended.
 *
 * The picture says what, the line says when and for how long, and a reader finds a thing by its
 * picture before reading a word — a banner already carries its title. Drawn at the card's width
 * and one year at a time, because at a year's scale a banner is three weeks wide and past two
 * years the pictures are too small to mean anything. Pictures take lanes as the packed chart's bars
 * do, a lane held until both the picture and its line have ended (`pictureLanes`). A picture near
 * the year's end is held inside the card, its line still starting where the item did. A picture
 * opens its mark's item through `onOpen`, as a band does.
 */
export const YearPictures = ({
  data,
  from,
  to,
  shape,
  onOpen,
}: {
  data: TimelineData[];
  from: YearMonthDay;
  to: YearMonthDay;
  shape: ArtworkShape;
  onOpen: (mark: TimelineData) => void;
}) => {
  const [ref, measured] = useElementWidth<HTMLDivElement>();
  const coarse = useCoarsePointer();
  // The card's width once measured; before it is, a guess that only decides the first frame's lanes.
  const width = measured || 900;
  const totalDays = from.daysTo(to);
  const pictureWidth = PICTURE_HEIGHT * shapeRatioValues[shape];

  const items = data.filter((item) => inWindow(item, from, to)).toSorted((a, b) => (a.start < b.start ? -1 : 1));
  const geometry = items.map((item) => {
    const start = clampTo(item.start, from, to);
    const end = clampTo(item.end, from, to);
    const lineStart = (percentAtDate(from, start, totalDays) / 100) * width;
    return {
      lineStart,
      x1: lineStart + (percentOfSpan(start, end, totalDays) / 100) * width,
      // Where the picture is drawn, held inside the card for an item begun in the year's last weeks,
      // and so where its lane is taken from: packed from the line's start instead, a picture pulled
      // back off the edge lands on the one before it in the same lane.
      x0: Math.min(lineStart, width - pictureWidth),
      width: pictureWidth,
    };
  });
  const { lanes, laneCount } = pictureLanes(geometry, PICTURE_GAP);
  const ticks = buildTicks(from.toYearMonth(), to.toYearMonth(), totalDays);

  return (
    <CardContent>
      <TimelineAxis
        ticks={ticks}
        labelOf={(tick) => tick.monthLabel}
        align="start"
      />
      <Box
        ref={ref}
        sx={{ position: "relative" }}
        style={{ height: laneCount * PICTURE_ROW + AXIS_ROOM / 2 }}
      >
        <TimelineScale
          ticks={ticks}
          colour="divider"
          opacityOf={(tick) => (tick.level === "month" ? 0.5 : 1)}
        />
        {items.map((item, index) => {
          const { lineStart, x0, x1 } = geometry[index];
          const top = lanes[index] * PICTURE_ROW;
          return (
            <Box key={item.key}>
              <PictureHover
                mark={item}
                coarse={coarse}
              >
                <Box
                  sx={{ position: "absolute" }}
                  style={{ left: x0, top, height: PICTURE_HEIGHT }}
                >
                  {item.picture?.(PICTURE_HEIGHT, { onOpen: () => onOpen(item), openLabel: item.name })}
                </Box>
              </PictureHover>
              <Box
                sx={{ position: "absolute", height: 4, borderRadius: 2 }}
                style={{
                  left: lineStart,
                  top: top + PICTURE_HEIGHT + 3,
                  width: Math.max(4, x1 - lineStart),
                  backgroundColor: item.colour,
                  // An item still going runs out to the window's edge, faded, the end it has yet to reach.
                  opacity: item.open ? 0.6 : 1,
                }}
              />
            </Box>
          );
        })}
      </Box>
    </CardContent>
  );
};

/** The log's row heights: an entry, a month holding entries, a month holding none, and the lanes' gap. */
const LOG_SIZES = { entry: 52, month: 30, quiet: 20, gap: 6 };

/** How far apart the log's lanes stand, and the room either side of them. */
const LANE_PITCH = 10;
const GUTTER_PAD = 8;

/**
 * The most of a row the lanes may take. A phone's row is 358px, and a year of Shows can run a dozen
 * seasons at once — at the full pitch that is 136px of gutter beside 222 of names — so past eight
 * lanes they close up, down to a floor a line still reads at.
 */
const MAX_LANES_WIDTH = 84;
const MIN_LANE_PITCH = 5;

/**
 * A year as a log: time running down the page, newest first, a row per thing begun — its picture,
 * its name and its dates — under a heading per month, with each run drawn as a line in the lanes
 * beside the rows.
 *
 * Built for a phone, where the year's own scale is a few pixels a day and a name is what cannot be
 * shown on it: vertical scroll is the platform's own gesture, every name and date is readable, and
 * the lanes keep what the stacked rows show — what ran at once stands side by side. Rows are
 * ordinal, so a quiet month is a thin heading and a busy week several rows; `yearLog` reads a day's
 * height off the rows around it.
 */
export const YearLog = ({
  data,
  from,
  to,
  onOpen,
}: {
  data: TimelineData[];
  from: YearMonthDay;
  to: YearMonthDay;
  onOpen: (mark: TimelineData) => void;
}) => {
  const coarse = useCoarsePointer();
  const items = data.filter((item) => inWindow(item, from, to));
  const { rows, lines, height, laneCount } = yearLog(
    items.map((item) => ({ start: item.start, end: item.end, open: item.open ?? false })),
    from,
    to,
    LOG_SIZES,
  );
  const pitch = Math.max(MIN_LANE_PITCH, Math.min(LANE_PITCH, Math.floor(MAX_LANES_WIDTH / laneCount)));
  const gutter = GUTTER_PAD * 2 + laneCount * pitch;
  const laneX = (lane: number) => GUTTER_PAD + lane * pitch + pitch / 2;

  return (
    <CardContent>
      <Box
        sx={{ position: "relative" }}
        style={{ height }}
      >
        <svg
          width={gutter}
          height={height}
          style={{ position: "absolute", left: 0, top: 0 }}
        >
          {lines.map((line, index) => {
            const item = items[index];
            const x = laneX(line.lane);
            const begunHere = line.bottom < height;
            return (
              <g key={item.key}>
                {line.bottom - line.top >= 2 && (
                  <line
                    x1={x}
                    x2={x}
                    y1={line.top}
                    y2={line.bottom}
                    stroke={item.colour}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeOpacity={item.open ? 0.6 : 1}
                  />
                )}
                {begunHere && (
                  <circle
                    cx={x}
                    cy={line.bottom}
                    r={4}
                    fill={item.colour}
                  />
                )}
              </g>
            );
          })}
        </svg>
        {rows.map((row) =>
          row.kind === "month" ? (
            <Stack
              key={`${row.year}-${row.month}`}
              direction="row"
              spacing={1}
              sx={{ position: "absolute", alignItems: "center", borderTop: 1, borderColor: "divider" }}
              style={{ top: row.top, left: gutter, right: 0, height: row.height }}
            >
              <Typography
                variant="caption"
                sx={NUMERIC_LABEL_SX}
              >
                {`${YearMonth.get(row.year, row.month).monthString()} ${row.year}`}
              </Typography>
              {row.count > 0 && (
                <Typography
                  variant="caption"
                  sx={MUTED_FIGURE_SX}
                >
                  {format(row.count)}
                </Typography>
              )}
            </Stack>
          ) : (
            <LogEntryRow
              key={items[row.index].key}
              item={items[row.index]}
              top={row.top}
              height={row.height}
              left={gutter}
              coarse={coarse}
              onOpen={onOpen}
            />
          ),
        )}
      </Box>
    </CardContent>
  );
};

/** One thing begun: its picture, then its name over the dates it ran. */
const LogEntryRow = ({
  item,
  top,
  height,
  left,
  coarse,
  onOpen,
}: {
  item: TimelineData;
  top: number;
  height: number;
  left: number;
  coarse: boolean;
  onOpen: (mark: TimelineData) => void;
}) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{ position: "absolute", alignItems: "center" }}
    style={{ top, left, right: 0, height }}
  >
    <PictureHover
      mark={item}
      coarse={coarse}
    >
      <Box sx={{ flexShrink: 0 }}>
        {item.picture?.(height - 8, { onOpen: () => onOpen(item), openLabel: item.name })}
      </Box>
    </PictureHover>
    <Box sx={{ minWidth: 0 }}>
      <Typography
        variant="body2"
        noWrap
      >
        {item.name}
      </Typography>
      <Typography
        variant="caption"
        noWrap
        component="div"
        sx={MUTED_FIGURE_SX}
      >
        {formatDateRange(item.start, item.open ? undefined : item.end)}
      </Typography>
    </Box>
  </Stack>
);
