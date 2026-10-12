/**
 * The band renderer every proportional strip is drawn by: a positioned band, and the gridlines
 * and labels it is read against.
 */
import { Box, Typography, useTheme } from "@mui/material";
import type { ReactNode } from "react";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { TOUCH_TARGET_SX, touchTargetSx } from "./touchTarget";
import type { BandLabel, TimelineTick } from "./timelineLayout";
import type { StripBand, StripSpan } from "./timelineStripData";

/** A positioned span from `buildStrip`, plus how this strip means to draw it. */
export type TimelineBand = Omit<StripBand<StripSpan>, "start" | "end"> & {
  colour: string;
  /** The item's hover card, mounted the way every chart in the app mounts one. */
  tooltip?: ReactNode;
  /**
   * Where the strip's own edge cut the span rather than the span ending: a year's row cuts a span
   * running across New Year. That end is drawn square, a rounded end saying the work began or ended
   * there.
   */
  cutStart?: boolean;
  cutEnd?: boolean;
  /** The band's name, which a strip with room for names places by the packed chart's rule. */
  label?: string;
  /**
   * What pressing the band does, where it opens the item: then the card ignores the pointer, as the
   * packed chart's does, and the press that opens the item's layer is also what puts the card away.
   */
  onPress?: () => void;
};

/**
 * A gridline per tick, so a band can be read against a date without hovering it. Lines only:
 * shading alternate years the way the full timeline does works there because the chart is
 * hundreds of pixels tall; on a strip this short the filled years read as bars and compete with
 * the bands they exist to measure. The colour is the caller's, a strip on an artwork ground
 * taking its palette's line where a ribbon on the paper takes the divider; `opacityOf` lets a
 * ribbon step its month lines back from its quarters.
 */
export const TimelineScale = ({
  ticks,
  colour,
  opacityOf,
}: {
  ticks: TimelineTick[];
  colour: string;
  opacityOf?: (tick: TimelineTick) => number;
}) => (
  // Full-height boxes would otherwise be the topmost hit target across the whole strip.
  <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
    {ticks.map((tick) => (
      <Box
        key={tick.percent}
        sx={{ position: "absolute", top: 0, bottom: 0, width: "1px", backgroundColor: colour }}
        style={{ left: `${tick.percent}%`, opacity: opacityOf?.(tick) }}
      />
    ))}
  </Box>
);

/**
 * The month labels a strip is read against, one per tick handed in, positioned as percentages of
 * its own width so it lines up with whatever stands above it at the same inset. Each starts at its
 * line, the line being the month's opening edge, so a centred label would name the gap between two.
 */
export const TimelineAxis = ({ ticks }: { ticks: TimelineTick[] }) => (
  <Box sx={{ position: "relative", height: 14 }}>
    {ticks.map((tick) => (
      <Typography
        key={tick.percent}
        variant="caption"
        sx={{
          position: "absolute",
          fontSize: 10,
          lineHeight: "14px",
          opacity: 0.6,
          userSelect: "none",
          paddingLeft: 0.5,
        }}
        style={{ left: `${tick.percent}%` }}
      >
        {tick.monthLabel}
      </Typography>
    ))}
  </Box>
);

/** Of the lane, so lanes stay visibly separate whatever the strip is divided into. */
const LANE_PADDING = 0.08;

/**
 * Everything about a band that is the same on every band.
 *
 * Its geometry and its colour go in `style` instead: those differ per band, and a distinct value
 * set reaching `sx` mints an emotion class of its own — a strip is dozens of bands and the full
 * timeline renders twice per data change, once at the default layout and once measured. What is
 * left here is the handful of forms a band takes, so the sheet holds four rules however many bands
 * are drawn.
 *
 * Hover leaves every box where it is: growing one reflows the row under the pointer, and a
 * transition on it never advances, because the tooltip opening re-renders the strip and restarts
 * the clock every frame.
 */
const BAND_SX = {
  position: "absolute",
  borderRadius: 0.5,
  // A tap leaves the band it landed on lit until the next tap lands elsewhere, which reads as a
  // selection the strip never made.
  "@media (hover: hover)": { "&:hover": { opacity: 1, filter: "brightness(1.25)" } },
  userSelect: "none",
} as const;

/**
 * The finger's reach on a band, which is the lane's own height once a strip has more than one.
 *
 * A lane of a 24px strip is 12px or less, so the full box would reach into its neighbours and the
 * later band would answer for both. Stated as a percentage of the band's own box, which is the
 * lane less its padding on each side — the band and its box are laid out in the same percentages,
 * so the reach follows a strip of any height without either knowing what that height is.
 *
 * Two constants rather than a figure per band: emotion mints a class per distinct value set, and a
 * stack of years draws hundreds of bands between them.
 */
const LANE_TOUCH_SX = touchTargetSx(`${100 / (1 - 2 * LANE_PADDING)}%`);

/**
 * A band's name, at the size and weight a caller measures it at before placing it (`placeBandLabels`).
 * A child of the band wherever it stands, so the pointer on the name is the pointer on the band and
 * its card opens from either, as the packed chart's label and bar do.
 */
export const BAND_LABEL_SIZE = 11;
export const BAND_LABEL_WEIGHT = 500;
export const BAND_LABEL_PADDING = 4;

const BAND_LABEL_SX = {
  position: "absolute",
  top: "50%",
  transform: "translateY(-50%)",
  paddingX: `${BAND_LABEL_PADDING}px`,
  fontSize: BAND_LABEL_SIZE,
  fontWeight: BAND_LABEL_WEIGHT,
  lineHeight: 1.3,
  whiteSpace: "nowrap",
  overflow: "hidden",
  textOverflow: "ellipsis",
} as const;

/**
 * Where a placed name stands against its band, in the packed chart's colours: on the band in the
 * band's own contrast colour, cut short with an ellipsis where nothing held it; in a gap in the
 * card's ink; and running from the band into the gap painted in both, switching at the band's edge
 * to the pixel, since no one colour reads on both grounds.
 */
const bandLabelStyle = (label: BandLabel, onBar: () => string, onCard: string) => {
  switch (label.placement) {
    case "left":
      return { right: "100%", color: onCard };
    case "right":
      return { left: "100%", color: onCard };
    case "span":
      return {
        left: 0,
        width: label.roomPx,
        color: "transparent",
        backgroundImage: `linear-gradient(to right, ${onBar()} 0 ${label.barPx}px, ${onCard} ${label.barPx}px)`,
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
      };
    case "center":
      return { left: 0, width: label.barPx, color: onBar() };
  }
};

/** A band whose press opens its item says so under the pointer, as the packed chart's bars do. */
const PRESSABLE_BAND_SX = { cursor: "pointer" } as const;

export const TimelineBandBox = ({
  startPercent,
  widthPercent,
  lane,
  laneCount,
  colour,
  tooltip,
  cutStart,
  cutEnd,
  placedLabel,
  onPress,
  coarse,
}: TimelineBand & {
  laneCount: number;
  /** The band's name and where it stands, where the strip has placed one. */
  placedLabel?: BandLabel;
  /** Read once by a strip drawing hundreds of bands; asked by the card itself where not given. */
  coarse?: boolean;
}) => {
  const theme = useTheme();
  const laneHeight = 100 / laneCount;
  // Lanes keep a gap between them; a single lane takes the strip's whole height.
  const inset = laneCount > 1 ? laneHeight * LANE_PADDING : 0;

  return (
    <HoverCardTooltip
      colour={colour}
      title={tooltip}
      placement="top"
      // The card ignores the pointer where the band takes the press in its place.
      transparent={!!onPress}
      coarse={coarse}
    >
      <Box
        sx={[BAND_SX, laneCount > 1 ? LANE_TOUCH_SX : TOUCH_TARGET_SX, !!onPress && PRESSABLE_BAND_SX]}
        onClick={onPress}
        style={{
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          top: `${lane * laneHeight + inset}%`,
          height: `${laneHeight - inset * 2}%`,
          backgroundColor: colour,
          borderTopLeftRadius: cutStart ? 0 : undefined,
          borderBottomLeftRadius: cutStart ? 0 : undefined,
          borderTopRightRadius: cutEnd ? 0 : undefined,
          borderBottomRightRadius: cutEnd ? 0 : undefined,
        }}
      >
        {placedLabel && (
          <Box
            component="span"
            sx={BAND_LABEL_SX}
            style={bandLabelStyle(
              placedLabel,
              () => theme.palette.getContrastText(colour),
              theme.vars.palette.text.primary,
            )}
          >
            {placedLabel.text}
          </Box>
        )}
      </Box>
    </HoverCardTooltip>
  );
};
