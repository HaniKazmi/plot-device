/**
 * The one proportional bar every surface stating a share is drawn on — the Top lists, the genre
 * bridge, a folded card's preview ring.
 *
 * Its own module because a bar needs MUI's `Box` and `Stack` and the hover dim it shares with a
 * legend, and nothing else — in particular nothing of `TimelineBand.tsx`, whose `Tooltip` brings
 * the Popper engine `tests/architecture.test.ts` pins off the first paint. A shell drawing a bar
 * pays for the bar.
 */
import { Box, type BoxProps, Stack } from "@mui/material";
import { dimSx } from "./typography";

const Segment = ({
  percent,
  backgroundColour,
  spacing: spacingProp,
  sx,
  ...props
}: {
  percent: number;
  backgroundColour: string;
  spacing?: number;
} & BoxProps) => {
  // The default is applied after the pattern — inside it, it bails the component out of the React
  // Compiler — while the rename keeps `spacing` out of the rest object spread into `Box`.
  const spacing = spacingProp ?? 2;
  return (
    <Box
      sx={{
        width: `${percent}%`,
        height: (theme) => theme.spacing(spacing),
        backgroundColor: backgroundColour,
        // No transition here: `dimSx` carries the pair, and a segment declaring the same property
        // would leave which value wins to the order this spread happens to run in.
        ...sx,
      }}
      {...props}
    />
  );
};

/**
 * One proportional bar: the segments of a whole in a row, with the hover dim that ties the bar to
 * whatever legend a caller stands beside it.
 *
 * All of the geometry — height, corner radius, the gap between segments — is fixed here, so every
 * bar in the app is the same object: a bar that read differently from its neighbours would invite
 * a meaning the difference does not carry.
 *
 * The dim is controlled rather than held here: a legend outside this shell has to fade in step
 * with it, so both halves read one `hovered` name. Both halves of it are optional, for a bar
 * standing where there is nothing to hover — a folded card's preview, which is a picture of the
 * chart and not the chart.
 */
const BAR_HEIGHT = 1.5;

export const ProportionalBar = ({
  items,
  hovered,
  onHover,
}: {
  items: { name: string; percent: number; colour: string }[];
  hovered?: string | null;
  onHover?: (name: string | null) => void;
}) => (
  <Stack
    direction="row"
    spacing={0.25}
    sx={{ alignItems: "center" }}
  >
    {items.map((item) => (
      <Segment
        key={item.name}
        percent={item.percent}
        backgroundColour={item.colour}
        spacing={BAR_HEIGHT}
        onMouseEnter={() => onHover?.(item.name)}
        onMouseLeave={() => onHover?.(null)}
        sx={{
          borderRadius: 0.5,
          ...dimSx(hovered ?? null, item.name),
          // A segment answers a hover and nothing else. A pointer cursor here promises a drilldown
          // that does not exist, and the dim already says the segment is live.
          cursor: "default",
        }}
      />
    ))}
  </Stack>
);
