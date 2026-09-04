import { Box, Button, Card, CardContent, Stack, Typography } from "@mui/material";
import { useState, type ReactNode } from "react";
import { usePhone } from "./breakpoints";

/**
 * A segment's own type, so the disclosure reads as one more of the controls the page already has
 * rather than as a call to action. The same 12px, unshouted casing and compact padding
 * `SegmentedControl` sets, which is what the reader has been pressing everywhere else.
 */
const TOGGLE_SX = { fontSize: 12, textTransform: "none", paddingY: 0.5, paddingX: 1.25, flexShrink: 0 } as const;

/** How tall a preview stands: enough for a shape, short enough that it is not the chart. */
const SPARK_HEIGHT = 44;
/** A column with nothing in it still says the year happened. */
const SPARK_FLOOR = 2;

/**
 * A chart card that opens on request.
 *
 * On a phone the charts are the most expensive thing on the page and the least of what it is for:
 * a sunburst, a barchart and a timeline cost about three screens of scrolling before the library
 * a reader came to browse. Folded, each is its header, a picture of its own shape and one line of
 * words — which is what most readings of a chart come to anyway — and the chart itself mounts only
 * when asked for. From `sm` up nothing here applies and the card is the card it always was.
 *
 * `children` bring their own `CardContent`, so a chart keeps whatever padding its own shell asks
 * for and this shell owns only the card, the header and the fold row.
 *
 * The state is a card's own and lives for as long as the page does: leaving the tab unmounts it,
 * which is the same answer a reader gets from every other chart control here.
 */
export const FoldedChart = ({
  header,
  summary,
  preview,
  children,
}: {
  /** The card's own `SectionHeader`, controls and all — it heads both states. */
  header: ReactNode;
  /** What the chart says, in one line, for a reader who does not open it. */
  summary: string;
  /** The chart's shape at a glance: a sparkline, a proportional bar. */
  preview?: ReactNode;
  children: ReactNode;
}) => {
  const phone = usePhone();
  const [shown, setShown] = useState(false);

  if (!phone)
    return (
      <Card>
        {header}
        {children}
      </Card>
    );

  return (
    <Card>
      {header}
      {shown && children}
      <CardContent>
        <Stack spacing={1}>
          {!shown && preview}
          <Stack
            direction="row"
            spacing={1}
            sx={{ alignItems: "center", justifyContent: "space-between" }}
          >
            <Typography
              variant="caption"
              sx={{ color: "text.secondary" }}
            >
              {summary}
            </Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => setShown(!shown)}
              sx={TOGGLE_SX}
            >
              {shown ? "Hide chart" : "Show chart"}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
};

/**
 * A column per value at its share of the largest, as a row of boxes rather than a chart.
 *
 * The barchart's preview is the shape of its own pivot — where the library's years are heavy and
 * where they are thin — and that shape is a dozen `div`s. Mounting a charting library to draw it
 * would cost the whole thing the fold exists to defer.
 */
export const Sparkline = ({ values }: { values: number[] }) => {
  const peak = Math.max(...values, 0);
  if (values.length === 0 || peak === 0) return null;

  return (
    <Stack
      direction="row"
      spacing={0.25}
      aria-hidden
      sx={{ height: SPARK_HEIGHT, alignItems: "flex-end" }}
    >
      {values.map((value, index) => (
        <Box
          key={index}
          sx={{
            flexGrow: 1,
            flexBasis: 0,
            minWidth: 0,
            borderRadius: 0.5,
            backgroundColor: "primary.main",
            height: Math.max((value / peak) * SPARK_HEIGHT, SPARK_FLOOR),
          }}
        />
      ))}
    </Stack>
  );
};
