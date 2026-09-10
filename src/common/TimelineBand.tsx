/**
 * The band renderer every proportional strip is drawn by: a positioned band, the year gridlines
 * and labels it is read against, and the card the crossings stack seats a strip in.
 *
 * It is the one part of the card layer that needs MUI's `Tooltip`, a band naming its span being
 * the app's only hover label. That Popper engine is about 11 kB gzipped, and
 * `tests/architecture.test.ts` pins that nothing `main.tsx` evaluates reaches it — so the band
 * renderer stands apart from the card shell, and a shell wanting a swatch or a proportional bar
 * takes it from `./Swatch` or `./ProportionalBar` without pulling the Popper in behind it.
 */
import { Box, Card, CardContent, Theme, Tooltip, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import type { MouseEventHandler, ReactElement, ReactNode } from "react";
import { useArtworkPalette } from "./artworkPalette";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { TOUCH_TARGET_SX, touchTargetSx } from "./touchTarget";
import { shortYear } from "./date";
import { FADE_Z } from "./ScrollFade";
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

const STRIP_HEIGHT = 3;

/**
 * The inset the card holds its strip at, in spacing steps.
 *
 * One number because two things are measured from it: the padding that puts the track there, and
 * the offset a sticky caption rests at, which has to be the same edge or the name and the bands it
 * labels disagree the moment the reader scrolls.
 */
const STRIP_PADDING = 1;

/**
 * A proportional strip of tracked spans against a fixed scale — the seasons of a show, the games
 * in a franchise.
 *
 * Bands are positioned rather than chained, so the shell owns the whole coordinate space and a
 * caller cannot couple to it: everything here reads `startPercent` and `widthPercent` off
 * `buildStrip` and never asks how they were arrived at.
 */
export const TimelineCard = (props: {
  bands: TimelineBand[];
  laneCount: number;
  ticks: TimelineTick[];
  caption?: ReactNode;
  /**
   * One strip of a stack that scrolls sideways on a scale they share, rather than a card standing
   * on its own.
   *
   * Three things follow from that and all three are the shell's to do, because all three are about
   * markup only this component renders. The years are stated once beneath the stack, not per strip
   * — twelve identical label rows is the axis repeated, not twelve axes, which is what
   * `TimelineAxis` is exported for. The card stops clipping, because a caption cannot be sticky
   * inside a box that hides its overflow. And the caption pins at the strip's own inset, so a name
   * stays readable while its own track travels under it and stays in the column its bands are
   * drawn in — above the fade there, since a name is not part of the track running out of the card.
   *
   * Read off `props` rather than defaulted in the pattern: a destructured default is an assignment
   * the React Compiler cannot lower, and it bails the whole component out of memoization.
   */
  inStack?: boolean;
}) => {
  const { bands, laneCount, ticks, caption } = props;
  const inStack = props.inStack ?? false;
  const palette = useArtworkPalette();

  return (
    <Grid size={12}>
      <Card
        variant="elevation"
        sx={{ height: "100%", background: "unset", color: "unset", ...(inStack && { overflow: "visible" }) }}
      >
        <CardContent
          sx={{
            ":last-child": { paddingBottom: STRIP_PADDING },
            height: "100%",
            padding: STRIP_PADDING,
            paddingTop: 0,
          }}
        >
          {caption && (
            <Typography
              variant="caption"
              // One line, whatever the name in it turned out to be: a caption that wraps pushes
              // the strip down by its own height, and the strip is what the card is measuring.
              noWrap
              sx={{
                display: "block",
                opacity: 0.7,
                paddingBottom: 0.5,
                ...(inStack && {
                  position: "sticky",
                  // The strip's own inset, not the scroller's edge: a sticky offset is measured
                  // from the scrollport, so a zero here rests the name where it belongs and then
                  // steps a padding's width left of every band it labels as soon as the reader
                  // scrolls. Spelled through `spacing` because `left` takes a raw length, where the
                  // padding above it is read as a spacing step.
                  left: (theme: Theme) => theme.spacing(STRIP_PADDING),
                  width: "fit-content",
                  maxWidth: "100%",
                  zIndex: FADE_Z + 1,
                }),
              }}
            >
              {caption}
            </Typography>
          )}
          <Box
            sx={{
              position: "relative",
              height: (theme) => theme.spacing(STRIP_HEIGHT),
              borderRadius: 1,
              overflow: "hidden",
              // The empty track and the gridlines are drawn on the card's ground, so they are taken
              // from it. The theme's own tokens are mixed for the theme's background, which is not
              // what a strip on an extracted artwork colour is sitting on.
              backgroundColor: palette.tile,
            }}
          >
            <TimelineScale ticks={ticks} />
            {bands.map((band) => (
              <TimelineBandBox
                {...band}
                laneCount={laneCount}
                key={band.key}
              />
            ))}
          </Box>
          {!inStack && <TimelineAxis ticks={ticks} />}
        </CardContent>
      </Card>
    </Grid>
  );
};

/**
 * A gridline per year, so a band can be read against a date without hovering it.
 *
 * Lines only. Shading alternate years the way the full timeline does works there because the
 * chart is hundreds of pixels tall; on a strip this short the filled years read as bars and
 * compete with the bands they exist to measure — most of all on a card whose ground is an
 * extracted artwork colour, where they pick that colour up.
 */
export const TimelineScale = ({ ticks }: { ticks: TimelineTick[] }) => {
  const palette = useArtworkPalette();

  return (
    // Full-height boxes would otherwise be the topmost hit target across the whole strip.
    <Box sx={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {ticks.map((tick) => (
        <Box
          key={tick.year}
          sx={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: `${tick.percent}%`,
            width: "1px",
            backgroundColor: palette.line,
          }}
        />
      ))}
    </Box>
  );
};

/** Sparse enough that the labels do not collide at card width, and land on round years. */
const LABEL_EVERY_YEARS = 5;

/**
 * The year labels a strip is read against.
 *
 * Exported so a stack of strips sharing one scale can state them once beneath itself rather than
 * once per strip. It positions its labels as percentages of its own width, so it lines up with the
 * strips above wherever it is placed at their inset.
 */
export const TimelineAxis = ({ ticks }: { ticks: TimelineTick[] }) => (
  <Box sx={{ position: "relative", height: 14, marginTop: 0.25 }}>
    {ticks
      .filter((tick) => tick.year % LABEL_EVERY_YEARS === 0)
      .map((tick) => (
        <Typography
          key={tick.year}
          variant="caption"
          sx={{
            position: "absolute",
            left: `${tick.percent}%`,
            transform: "translateX(-50%)",
            fontSize: 10,
            lineHeight: "14px",
            opacity: 0.6,
            userSelect: "none",
          }}
        >
          {shortYear(tick.year)}
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
