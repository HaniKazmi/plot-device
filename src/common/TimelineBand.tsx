/**
 * The band renderer every proportional strip is drawn by: a positioned band, and the gridlines
 * and labels it is read against.
 *
 * It is the one part of the card layer that needs MUI's `Tooltip`, a band naming its span being
 * the app's only hover label. That Popper engine is about 11 kB gzipped, and
 * `tests/architecture.test.ts` pins that nothing `main.tsx` evaluates reaches it — so the band
 * renderer stands apart from the card shell, and a shell wanting a swatch or a proportional bar
 * takes it from `./Swatch` or `./ProportionalBar` without pulling the Popper in behind it.
 */
import { Box, Tooltip, Typography } from "@mui/material";
import type { MouseEventHandler, ReactElement, ReactNode } from "react";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { TOUCH_TARGET_SX, touchTargetSx } from "./touchTarget";
import type { TimelineTick } from "./timelineLayout";
import type { StripBand, StripSpan } from "./timelineStripData";

/** A positioned span from `buildStrip`, plus how this strip means to draw it. */
export type TimelineBand = Omit<StripBand<StripSpan>, "start" | "end"> & {
  colour: string;
  tooltip?: ReactNode;
  /**
   * The tooltip is the item's whole hover card rather than a line naming the span, so it is mounted
   * the way every chart in the app mounts one — at the shared width, on a mat of the band's own
   * colour. A strip whose bands only name themselves keeps the plain tooltip: the mat and the width
   * are for a card, and a line of text in a 500px box is mostly empty ground.
   */
  hoverCard?: boolean;
  /** Context rather than the subject of the card, drawn dimmer. */
  muted?: boolean;
  /** The span is an estimate, drawn so its edges do not read as dates. */
  imprecise?: boolean;
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
 * The labels a strip is read against, one per tick handed in, positioned as percentages of its
 * own width so it lines up with whatever stands above it at the same inset. A year label is
 * centred on its line; a month label starts at it, the line being the month's opening edge, so a
 * centred label would name the gap between two lines.
 */
export const TimelineAxis = ({
  ticks,
  labelOf,
  align,
}: {
  ticks: TimelineTick[];
  labelOf: (tick: TimelineTick) => string;
  align: "centre" | "start";
}) => (
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
          ...(align === "centre" ? { transform: "translateX(-50%)" } : { paddingLeft: 0.5 }),
        }}
        style={{ left: `${tick.percent}%` }}
      >
        {labelOf(tick)}
      </Typography>
    ))}
  </Box>
);

export const FADED_ENDS = "linear-gradient(to right, transparent, #000 25%, #000 75%, transparent)";

/** Of the lane, so lanes stay visibly separate whatever the strip is divided into. */
const LANE_PADDING = 0.08;
/** Of the whole strip, and only when there is one lane to inset within. */
const MUTED_INSET = 0.2;

/**
 * A band's tooltip, mounted as whichever of the two things it is.
 *
 * Both kinds sit on the same band, so the choice is made here rather than at each strip: a caller
 * says what its tooltip is and never how wide it should be.
 */
const BandTooltip = ({
  colour,
  title,
  hoverCard,
  children,
}: {
  colour: string;
  title?: ReactNode;
  hoverCard?: boolean;
  /** Cloned with a tap handler under a coarse pointer, where the hover card is a sheet. */
  children: ReactElement<{ onClick?: MouseEventHandler<HTMLElement> }>;
}) =>
  hoverCard ? (
    <HoverCardTooltip
      colour={colour}
      title={title}
      placement="top"
    >
      {children}
    </HoverCardTooltip>
  ) : (
    <Tooltip
      title={title}
      placement="top"
      disableHoverListener={!title}
      disableTouchListener={!title}
    >
      {children}
    </Tooltip>
  );

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
 * the clock every frame. `opacity` stays in this half for the same rule — an inline `opacity`
 * outranks any stylesheet, so a muted band written into `style` could not be lit on hover at all.
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
 * crossings stack draws hundreds of bands between them.
 */
const LANE_TOUCH_SX = touchTargetSx(`${100 / (1 - 2 * LANE_PADDING)}%`);

/**
 * An estimated span dissolves at both ends rather than stopping at one, because a hard edge is a
 * date and this band does not have one. Square-cut too, so the rounded caps stay the mark of a
 * span the sheet actually pinned down.
 */
const IMPRECISE_BAND_SX = {
  maskImage: FADED_ENDS,
  WebkitMaskImage: FADED_ENDS,
  borderRadius: 0,
} as const;

/** Context rather than subject, on a strip where one band is the card's own. */
const MUTED_BAND_SX = { opacity: 0.6 } as const;

/**
 * The card's own subject against its context. Opacity alone does not carry it once the bands are
 * lane-height: each one is coloured by its own platform, so a dimmed band beside a
 * differently-coloured one reads as a different platform rather than as context. `currentColor` is
 * the ground's contrast text, so the ring lands legibly on an extracted artwork colour whichever
 * way that fell. A caller with no subject to single out — the ribbon, where every mark is a peer —
 * opts out with `frameless`: on a mark floored to a couple of pixels the ring would be most of the
 * mark, burying the fill it exists to set apart.
 */
const RINGED_BAND_SX = { boxShadow: "inset 0 0 0 1px currentColor" } as const;

export const TimelineBandBox = ({
  startPercent,
  widthPercent,
  lane,
  laneCount,
  colour,
  tooltip,
  hoverCard,
  muted,
  imprecise,
  frameless,
}: TimelineBand & { laneCount: number; frameless?: boolean }) => {
  const laneHeight = 100 / laneCount;
  // On a single lane the card's own game keeps the full height and its siblings are inset, which
  // is the clearest reading of "this one, among these". Once the strip is divided there is no
  // height left to spend on that — a sibling inset within an eight-pixel lane is a hairline — so
  // every band fills its lane and the distinction falls to opacity alone.
  const inset = laneCount > 1 ? laneHeight * LANE_PADDING : muted ? 100 * MUTED_INSET : 0;

  return (
    <BandTooltip
      colour={colour}
      title={tooltip}
      hoverCard={hoverCard}
    >
      <Box
        // Later entries win, so the imprecise band's square cut lands over the rounded default.
        sx={[
          BAND_SX,
          laneCount > 1 ? LANE_TOUCH_SX : TOUCH_TARGET_SX,
          !!imprecise && IMPRECISE_BAND_SX,
          !!muted && MUTED_BAND_SX,
          !muted && !frameless && RINGED_BAND_SX,
        ]}
        style={{
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          top: `${lane * laneHeight + inset}%`,
          height: `${laneHeight - inset * 2}%`,
          backgroundColor: colour,
        }}
      />
    </BandTooltip>
  );
};
