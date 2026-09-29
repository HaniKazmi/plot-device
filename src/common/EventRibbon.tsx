import { Box, ButtonBase, CardContent, Stack, Typography, useTheme, type Theme } from "@mui/material";
import type { Ref } from "react";
import {
  BAND_LABEL_PADDING,
  BAND_LABEL_SIZE,
  BAND_LABEL_WEIGHT,
  TimelineAxis,
  TimelineBandBox,
  TimelineScale,
  type TimelineBand,
} from "./TimelineBand";
import { measureLabel } from "./labelWidth";
import { placeBandLabels } from "./timelineLayout";
import { useElementWidth } from "./useElementWidth";
import { useCoarsePointer } from "./useCoarsePointer";
import type { TimelineTick } from "./timelineLayout";
import { MUTED_FIGURE_SX, focusRingSx } from "./typography";

interface RibbonRow {
  key: string;
  /** The row's own name in the left gutter — a year, on the tabs that stack years. */
  label: string;
  /** What pressing the label does, and the same in words. */
  onPress: () => void;
  pressLabel: string;
  bands: TimelineBand[];
  laneCount: number;
}

/** A row's height while its marks take one lane, as a ribbon of points does. */
const TRACK_HEIGHT = 24;
const LABEL_WIDTH = 5;

/**
 * The height one lane of a row takes, which is what a row grows by once its spans overlap.
 *
 * A row of points needs one lane and stands at the track's own height; a year of seasons running
 * side by side can need eight, and divided into a fixed track each would be a hairline no finger
 * can land on. Eight pixels is a four-pixel band between its lane's padding.
 */
const LANE_PITCH = 8;

/** A row's label and the axis's spacer stay one width, or the axis desynchronises from the tracks. */
const GUTTER_SX = { width: (theme: Theme) => theme.spacing(LABEL_WIDTH), flexShrink: 0 } as const;

/** A row's label, which is a press: the gutter's own shape, right-aligned against the track. */
const PRESS_SX = {
  ...GUTTER_SX,
  justifyContent: "flex-end",
  borderRadius: 1,
} as const;

/**
 * A stack of tracks on one shared scale, each row a period and each mark a moment or a span in it.
 *
 * The caller fixes the rows and only the marks move, so the one tick array feeds every row's
 * gridlines and the single axis beneath the stack, and a line and the label under it cannot drift
 * apart — the same one-array rule the full timeline follows. A row grows by a lane pitch for each
 * lane its marks take (`LANE_PITCH`). Tooltips should arrive through `LazyTooltip`: the ribbon
 * positions hundreds of marks and only ever shows a handful of cards.
 *
 * A row's label is a press: the stacked timeline's year label is how a reader scopes the page to
 * that year.
 *
 * A band handed a `label` wears it on a row of one lane, whose 24px holds the type where a lane of
 * two does not, placed by the packed chart's own rule (`placeBandLabels`): on the band where it
 * fits, else in the gap either side or run on from the band into the gap after, and cut short on
 * the band where nothing holds it — so a name stands on a year's row wherever it would on Across.
 */
export const EventRibbon = ({ rows, ticks }: { rows: RibbonRow[]; ticks: TimelineTick[] }) => {
  const theme = useTheme();
  // Asked once for the ribbon: a stack of years is hundreds of bands, each mounting a hover card
  // that would otherwise subscribe to the same question on its own.
  const coarse = useCoarsePointer();
  // Every track is the axis's width, so the one measurement answers for all of them; before it is
  // taken, no name is drawn rather than one drawn against a guess.
  const [trackRef, trackWidth] = useElementWidth<HTMLDivElement>();
  const labelFont = `${BAND_LABEL_WEIGHT} ${BAND_LABEL_SIZE}px ${theme.typography.fontFamily}`;
  const measure = (text: string) => measureLabel(text, labelFont, BAND_LABEL_SIZE, BAND_LABEL_PADDING);
  const labelsOf = (row: RibbonRow) =>
    row.laneCount === 1 && trackWidth && row.bands.some((band) => band.label)
      ? placeBandLabels(row.bands, trackWidth, measure)
      : undefined;

  return (
    <CardContent sx={{ ":last-child": { paddingBottom: 2 } }}>
      <Stack spacing={0.75}>
        {rows.map((row) => {
          const labels = labelsOf(row);
          return (
            <Stack
              key={row.key}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <ButtonBase
                onClick={row.onPress}
                aria-label={row.pressLabel}
                sx={{ ...PRESS_SX, ...focusRingSx(theme) }}
              >
                <Typography
                  variant="caption"
                  sx={MUTED_FIGURE_SX}
                >
                  {row.label}
                </Typography>
              </ButtonBase>
              <Box
                sx={{
                  position: "relative",
                  flexGrow: 1,
                  borderRadius: 1,
                  overflow: "hidden",
                  backgroundColor: "action.hover",
                }}
                style={{ height: Math.max(TRACK_HEIGHT, row.laneCount * LANE_PITCH) }}
              >
                <TimelineScale
                  ticks={ticks}
                  colour="divider"
                  opacityOf={(tick) => (tick.level === "month" ? 0.5 : 1)}
                />
                {row.bands.map((band) => (
                  <TimelineBandBox
                    {...band}
                    placedLabel={labels?.get(band.key)}
                    laneCount={row.laneCount}
                    coarse={coarse}
                    // Every mark here is a peer — there is no "this one, among these" for the
                    // subject ring to say, and at point-event widths it would drown the fill.
                    frameless
                    key={band.key}
                  />
                ))}
              </Box>
            </Stack>
          );
        })}
        <RibbonAxis
          ticks={ticks}
          trackRef={trackRef}
        />
      </Stack>
    </CardContent>
  );
};

/** The months beneath the stack, in a column the tracks' own width, which is measured here. */
const RibbonAxis = ({ ticks, trackRef }: { ticks: TimelineTick[]; trackRef: Ref<HTMLDivElement> }) => (
  <Stack
    direction="row"
    spacing={1}
  >
    <Box sx={GUTTER_SX} />
    <Box
      ref={trackRef}
      sx={{ flexGrow: 1 }}
    >
      <TimelineAxis
        ticks={ticks}
        labelOf={(tick) => tick.monthLabel}
        align="start"
      />
    </Box>
  </Stack>
);
