import { Box, Card, CardContent, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { TimelineBandBox, type TimelineBand } from "./Card";
import type { TimelineTick } from "./timelineLayout";
import { MUTED_FIGURE_SX } from "./typography";

export interface RibbonRow {
  key: string;
  /** The row's own name in the left gutter — a year, on the tabs that stack years. */
  label: string;
  bands: TimelineBand[];
  laneCount: number;
}

const TRACK_HEIGHT = 3;
const LABEL_WIDTH = 5;

/**
 * A stack of tracks on one shared scale, for events that are points in time rather than spans —
 * each row a period, each mark a moment in it.
 *
 * This is the shape a packed timeline cannot take: its row packing frees a row the moment a
 * span ends, and a point ends the moment it starts, so a whole library of them packs into a
 * single row. Here the rows are fixed by the caller and only the marks move.
 *
 * One tick array feeds every row's gridlines and the single axis beneath the stack, so a line
 * and the label under it cannot drift apart — the same one-array rule the full timeline follows.
 * Tooltips should arrive through `LazyTooltip`: the ribbon positions hundreds of marks and only
 * ever shows a handful of cards.
 */
export const EventRibbon = ({
  rows,
  ticks,
  children,
}: {
  rows: RibbonRow[];
  ticks: TimelineTick[];
  children: ReactNode;
}) => {
  return (
    <Card>
      {children}
      <CardContent sx={{ ":last-child": { paddingBottom: 2 } }}>
        <Stack spacing={0.75}>
          {rows.map((row) => (
            <Stack
              key={row.key}
              direction="row"
              spacing={1}
              sx={{ alignItems: "center" }}
            >
              <Typography
                variant="caption"
                sx={{
                  width: (theme) => theme.spacing(LABEL_WIDTH),
                  flexShrink: 0,
                  textAlign: "right",
                  ...MUTED_FIGURE_SX,
                  userSelect: "none",
                }}
              >
                {row.label}
              </Typography>
              <Box
                sx={{
                  position: "relative",
                  flexGrow: 1,
                  height: (theme) => theme.spacing(TRACK_HEIGHT),
                  borderRadius: 1,
                  overflow: "hidden",
                  backgroundColor: "action.hover",
                }}
              >
                <RibbonScale ticks={ticks} />
                {row.bands.map((band) => (
                  <TimelineBandBox
                    {...band}
                    laneCount={row.laneCount}
                    // Every mark here is a peer — there is no "this one, among these" for the
                    // subject ring to say, and at point-event widths it would drown the fill.
                    frameless
                    key={band.key}
                  />
                ))}
              </Box>
            </Stack>
          ))}
          <RibbonAxis ticks={ticks} />
        </Stack>
      </CardContent>
    </Card>
  );
};

/** Month gridlines, the quarter ones a step stronger so the eye has something to count by. */
const RibbonScale = ({ ticks }: { ticks: TimelineTick[] }) => (
  // Full-height boxes would otherwise be the topmost hit target across the whole track.
  <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {ticks.map((tick) => (
      <Box
        key={tick.monthLabel}
        sx={{
          position: "absolute",
          top: 0,
          bottom: 0,
          left: `${tick.percent}%`,
          width: "1px",
          backgroundColor: "divider",
          opacity: tick.level === "month" ? 0.5 : 1,
        }}
      />
    ))}
  </Box>
);

const RibbonAxis = ({ ticks }: { ticks: TimelineTick[] }) => (
  <Stack
    direction="row"
    spacing={1}
  >
    <Box sx={{ width: (theme) => theme.spacing(LABEL_WIDTH), flexShrink: 0 }} />
    <Box sx={{ position: "relative", flexGrow: 1, height: 14 }}>
      {ticks.map((tick) => (
        <Typography
          key={tick.monthLabel}
          variant="caption"
          sx={{
            position: "absolute",
            left: `${tick.percent}%`,
            fontSize: 10,
            lineHeight: "14px",
            opacity: 0.6,
            userSelect: "none",
            // Labels sit at the month's start rather than centred on it: the line above is the
            // month's opening edge, and a centred label would name the gap between two lines.
            paddingLeft: 0.5,
          }}
        >
          {tick.monthLabel}
        </Typography>
      ))}
    </Box>
  </Stack>
);
