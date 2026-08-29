import {
  Box,
  type BoxProps,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  Divider,
  Grow,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography,
  useTheme,
  type ChipProps,
} from "@mui/material";
import { createContext, useContext, type FunctionComponent, type ReactNode, useEffect, useRef, useState } from "react";
import { CalendarMonthOutlined } from "@mui/icons-material";
import { cachedColour, extractColourFrom, withAlpha } from "../utils/colourUtils";
import { alpha } from "@mui/material/styles";
import Grid from "@mui/material/Grid";
import type { Colour } from "../utils/types";
import type { TimelineTick } from "./timelineLayout";

export interface CardMediaImageProps {
  image?: string;
  alt: string;
  colour?: Colour;
  chip?: Pick<ChipProps, "label" | "icon" | "onClick" | "variant"> & { colour?: Colour };
  lazy?: boolean;
  /**
   * Given the card's colour, because the panel accents itself with the artwork's own and only
   * this component ever extracts it.
   */
  footerComponent?: (colour?: Colour) => ReactNode;
  /**
   * Built lazily: `Finished` renders a card per item with no cap, and this tree is only ever
   * mounted for the one card whose dialog is open.
   */
  detailComponent?: () => ReactNode;
  sx?: SxProps<Theme>;
  landscape?: boolean;
  /** Derive the card's theme colour from the image once it loads. Costs a canvas read per image. */
  extractColour?: boolean;
}

export type TypedCardMediaImage<T> = FunctionComponent<
  Omit<CardMediaImageProps, "image" | "alt" | "detailComponent"> & { item: T }
>;

export const CardMediaImage = ({
  image,
  alt,
  chip,
  colour: propColour,
  lazy = false,
  footerComponent,
  detailComponent,
  landscape = false,
  extractColour = false,
  sx,
}: CardMediaImageProps) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  /** Lags `dialogOpen` on close so the detail tree survives the dialog's exit transition. */
  const [detailMounted, setDetailMounted] = useState<boolean>(false);
  // Only cards that opted into extraction seed from the cache, so a grid that means to stay
  // uncoloured is not tinted by whatever another component happened to read first.
  const [extracted, setExtracted] = useState<Colour | undefined>(() =>
    extractColour ? cachedColour(image) : undefined,
  );
  // Derived rather than seeded into state, so a card whose `colour` prop changes under it — the
  // same key showing a different item after a refetch — follows the prop instead of keeping the
  // value it mounted with.
  const colour = propColour ?? extracted;
  /**
   * The artwork's shape, which is what lets the dialog scale it up to the viewport rather than
   * only down. Held as the ratio rather than as the decision it feeds, so the decision can be left
   * to CSS and re-made on a resize or a rotation without a listener.
   */
  const [ratio, setRatio] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  const theme = useTheme();
  const dialogPalette = colour && artworkPalette(colour, theme);

  const readColour = (img: HTMLImageElement | null) => {
    if (img && !colour) extractColourFrom(img, setExtracted);
  };

  const readRatio = (img: HTMLImageElement | null) => {
    if (img?.naturalWidth) setRatio(img.naturalWidth / img.naturalHeight);
  };

  // `load` does not bubble, so React delivers it through a root listener that only sees events
  // dispatched once the element is in the document. An image served from cache can finish before
  // that, and then `onLoad` never runs and nothing else would ever ask it for a colour or a shape.
  // Checking the element after commit covers that case; `complete` with a non-zero `naturalWidth`
  // means the image is there to be read whether or not the event arrived.
  useEffect(() => {
    const img = imgRef.current;
    if (!img?.complete || img.naturalWidth === 0) return;
    setRatio(img.naturalWidth / img.naturalHeight);
    if (extractColour && !colour) extractColourFrom(img, setExtracted);
  }, [extractColour, colour, image]);

  return (
    <Card
      variant="elevation"
      sx={{
        height: "100%",
        position: "relative",
        backgroundColor: colour,
        display: landscape ? "flex" : undefined,
        color: (theme) => colour && theme.palette.getContrastText(colour),
      }}
    >
      <CardActionArea>
        <CardMedia
          height={"100%"}
          component="img"
          crossOrigin="anonymous"
          src={image}
          alt={alt}
          onClick={() => {
            // The detail dialog is themed from this colour, so it is worth reading even for a card
            // that did not ask for one.
            readColour(imgRef.current);
            setDialogOpen(true);
            setDetailMounted(true);
          }}
          loading={lazy ? "lazy" : undefined}
          ref={imgRef}
          onLoad={(el) => {
            readRatio(el.currentTarget);
            if (extractColour) readColour(el.currentTarget);
          }}
          sx={sx}
        />
        {chip && (
          <Chip
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              margin: 1,
              opacity: 0.8,
              backgroundColor: chip.colour ?? "primary.main",
              color: (theme) => theme.palette.getContrastText(chip.colour ?? colour ?? theme.palette.primary.main),
            }}
            label={chip.label}
            icon={chip.icon}
            onClick={chip.onClick}
            variant={chip.variant || "filled"}
            size="small"
          />
        )}
      </CardActionArea>
      {footerComponent?.(colour)}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={false}
        scroll="body"
        slots={{ transition: Grow }}
        slotProps={{
          paper: { sx: { backgroundColor: "unset", boxShadow: "unset", backgroundImage: "unset" } },
          transition: { onExited: () => setDetailMounted(false) },
        }}
      >
        <ArtworkPalette.Provider value={dialogPalette}>
          <Card
            variant="elevation"
            sx={{
              backgroundColor: colour,
              color: (theme) => colour && theme.palette.getContrastText(colour),
            }}
          >
            <Box
              onClick={() => setDialogOpen(false)}
              sx={{
                position: "relative",
              }}
            >
              <Box
                sx={{
                  background: colour && `linear-gradient(to bottom, ${withAlpha(colour, "00")} 80%, ${colour})`,
                  position: "absolute",
                  top: "90%",
                  left: 0,
                  right: 0,
                  bottom: 0,
                }}
              />
              <CardMedia
                component="img"
                crossOrigin="anonymous"
                sx={(theme) => {
                  // `svh` and not `vh`, because a phone reports `vh` with its toolbar retracted, so
                  // an image sized to it overflows the screen it is meant to fit. `dvh` would track
                  // the toolbar instead, and resize the artwork under the reader at the moment they
                  // scroll past it to the details.
                  const room = {
                    width: `calc(100vw - ${theme.spacing(4)})`,
                    height: `calc(100svh - ${theme.spacing(4)})`,
                  };

                  return {
                    objectFit: "contain",
                    display: "block",
                    // On their own these only ever take away: an element with an automatic width is
                    // already its intrinsic width, so artwork smaller than the screen stays small.
                    // They are still the whole rule until the shape is known.
                    maxWidth: room.width,
                    maxHeight: room.height,
                    ...(ratio && {
                      // Filling the width and deriving the height scales the artwork up as well as
                      // down. Which of the two is the binding one is left to `min`, so it is decided
                      // against the room actually available and decided again on a rotation — where
                      // a stored answer would be the one from whichever way round the screen was
                      // when the image loaded.
                      width: `min(${room.width}, calc(${room.height} * ${ratio}))`,
                      height: "auto",
                    }),
                  };
                }}
                src={image}
                title={alt}
                loading="lazy"
                onClick={() => setDialogOpen(false)}
              />
            </Box>
            <Box
              sx={{
                display: "flex",
              }}
            >
              <Box
                sx={{
                  flexGrow: "1",
                  width: "0px",
                }}
              >
                {detailMounted && detailComponent?.()}
              </Box>
            </Box>
          </Card>
        </ArtworkPalette.Provider>
      </Dialog>
    </Card>
  );
};

export const DetailCard = ({
  colour,
  label,
  value,
  large,
}: {
  colour?: string;
  label: string;
  value: string | ReactNode;
  large?: boolean;
}) => {
  const palette = useContext(ArtworkPalette);

  if (!value) return null;
  return (
    <Grid
      size={{
        xs: large ? 12 : 6,
        md: large ? 6 : 3,
      }}
    >
      {/* Elevated, against the theme's outlined default: the outlined variant draws a `divider`
          hairline, a neutral grey laid over whatever ground the artwork turned out to be.

          A tile carrying a colour of its own paints it. The rest take a wash of the card's own
          contrast colour, so they lift off a pale sample as readily as off a dark one — a raised
          edge alone all but disappears against a light ground. */}
      <Card
        variant="elevation"
        sx={{
          height: "100%",
          background: colour ?? palette?.tile ?? "unset",
          color: (theme) => (colour ? theme.palette.getContrastText(colour) : "unset"),
        }}
      >
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 2 },
            height: "100%",
          }}
        >
          <Stack
            direction={"column"}
            sx={{
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Typography
              align="center"
              variant="body1"
            >
              {value}
            </Typography>
            <Typography
              align="center"
              variant="caption"
              sx={{ color: colour ? undefined : palette?.muted, opacity: colour || !palette ? 0.8 : 1 }}
            >
              {label}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

/**
 * The panel beside or beneath a hover card's artwork: what the item is, when, and how much of it.
 *
 * It paints its own ground rather than sitting on the card's extracted colour, so the artwork is
 * the only place that colour appears at full strength and the type has a settled surface to be
 * read against. The colour comes back as the badge's accent, which is enough to tie the two.
 *
 * Beside a poster the panel is as tall as the artwork and the type cannot fill it — three lines
 * against a 2:3 poster leaves better than half the column empty. Pushing the title to the top and
 * the figures to the bottom spends that height as structure instead of leaving it as a gap.
 */
/**
 * One hue in three tones. Laying black over the artwork's colour darkens it into a surface white
 * type sits on while leaving the hue plainly recognisable — the panel is still *that* orange —
 * where re-lighting the channels towards a target would trade the hue away for the weight.
 *
 * The seam is the only place the colour appears at full strength, and the dates and stat labels
 * take it mixed towards white. Grey against a coloured panel reads as dead; the panel's own hue
 * reads as chosen, and keeps the whole card to one colour in three tones plus white.
 */
const SEAM_WIDTH = 3;
/** Of the ground's own contrast colour: the secondary tone, the seam, and a tile's lift. */
const MUTED_ALPHA = 0.72;
const SEAM_ALPHA = 0.22;
const TILE_ALPHA = 0.1;

/**
 * One hue in three tones, derived from a colour sampled off artwork. Every surface that carries a
 * sampled colour takes its ground, its type and its accent from here, so a thumbnail's strip and
 * the hover card above it are the same recipe rather than two treatments that happen to rhyme.
 *
 * The ground is the sample exactly, because that is what ties a surface to the art beside it.
 * Sampling holds anything between luma 30 and 230, so which of black and white can be read on it
 * changes from card to card — the type is therefore derived from the ground rather than fixed, and
 * turns over with it.
 *
 * The other two tones are that same contrast colour made transparent. Over a coloured ground it
 * composites to a tint of the ground's own hue, which is what a secondary tone wants to be: grey
 * against a coloured surface reads as dead where the surface's own hue reads as chosen. Mixing the
 * two by hand lands in the same place and has to be told which way to mix.
 */
const artworkPalette = (accent: Colour, theme: Theme) => {
  const onGround = theme.palette.getContrastText(accent);

  return {
    ground: { backgroundColor: accent },
    onGround,
    muted: alpha(onGround, MUTED_ALPHA),
    /** Rules and hairlines drawn on the ground: a gridline, an empty track, a seam. */
    line: alpha(onGround, SEAM_ALPHA),
    /** The edge where a surface meets the artwork it was sampled from. */
    seam: `${SEAM_WIDTH}px solid ${alpha(onGround, SEAM_ALPHA)}`,
    /** A tile lifted off the ground it sits on, in whichever direction reads against it. */
    tile: alpha(onGround, TILE_ALPHA),
  };
};

/**
 * The palette of the card a detail tile is sitting in.
 *
 * A tile has to lift off a ground it does not choose and cannot see — the dialog's ground is the
 * artwork's own colour, which only the card knows. Passing it down instead would mean naming it at
 * every one of the two dozen tiles the three domains build, none of which is otherwise interested.
 */
const ArtworkPalette = createContext<ReturnType<typeof artworkPalette> | undefined>(undefined);

/**
 * The panel beside or beneath a hover card's artwork: what the item is, when, and how much of it.
 *
 * Beside a poster the panel is as tall as the artwork and the type cannot fill it — three lines
 * against a 2:3 poster leaves better than half the column empty. Pushing the title to the top and
 * the figures to the bottom spends that height as structure instead of leaving it as a gap.
 */
export const CardPanel = ({
  title,
  subtitle,
  accent,
  dateRange,
  stats,
  landscape = false,
}: {
  title: string;
  subtitle?: string;
  accent?: Colour;
  dateRange: string;
  stats: { value: number | string; label: string }[];
  landscape?: boolean;
}) => {
  const theme = useTheme();
  const palette = accent && artworkPalette(accent, theme);
  const muted = palette?.muted;

  return (
    <CardContent
      sx={{
        display: "flex",
        flexDirection: "column",
        // Only a panel with height to spare has anything to distribute.
        justifyContent: landscape ? "space-between" : "flex-start",
        gap: 2,
        width: "100%",
        ":last-child": { paddingBottom: 2 },
        // Until the artwork has given up a colour the panel is the theme's own, so a card that
        // paints before extraction finishes is plain rather than wrong.
        ...(palette
          ? {
              ...palette.ground,
              color: palette.onGround,
              // Where the artwork meets the panel, so the two read as one card rather than as one
              // pasted onto the other. Rotated with the layout, never both.
              [landscape ? "borderLeft" : "borderTop"]: palette.seam,
            }
          : { backgroundColor: "background.paper", color: "text.primary" }),
      }}
    >
      <Stack
        spacing={0.5}
        sx={{ alignItems: "flex-start" }}
      >
        <Typography
          variant="h6"
          sx={{ fontWeight: 700, lineHeight: 1.25 }}
        >
          {title}
        </Typography>
        {/* Part of what the thing is called, but not the part the chart labels its bar with, so
            it sits under the title in the same tone the dates take. */}
        {subtitle && (
          <Typography
            variant="body2"
            sx={{ color: muted, opacity: muted ? 1 : 0.75 }}
          >
            {subtitle}
          </Typography>
        )}
        <Stack
          direction="row"
          spacing={0.75}
          sx={{ alignItems: "center", color: muted, opacity: muted ? 1 : 0.75 }}
        >
          <CalendarMonthOutlined sx={{ fontSize: 16 }} />
          <Typography variant="body2">{dateRange}</Typography>
        </Stack>
      </Stack>

      {stats.length > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ width: "100%" }}
        >
          {stats.map((stat) => (
            <StatTile
              key={stat.label}
              muted={muted}
              tile={palette?.tile}
              {...stat}
            />
          ))}
        </Stack>
      )}
    </CardContent>
  );
};

/** A figure and what it counts, set apart from the prose so the numbers can be read at a glance. */
const StatTile = ({
  value,
  label,
  muted,
  tile,
}: {
  value: number | string;
  label: string;
  muted?: string;
  tile?: string;
}) => (
  <Box
    sx={{
      flex: 1,
      padding: 1,
      borderRadius: 1,
      textAlign: "center",
      // A wash of the ground's own contrast colour, so a tile lifts off a pale sample as readily
      // as off a dark one.
      backgroundColor: tile ?? "action.hover",
    }}
  >
    <Typography
      component="div"
      sx={{ fontWeight: 700, fontSize: "1.25rem", lineHeight: 1.2 }}
    >
      {value}
    </Typography>
    <Typography
      variant="caption"
      sx={{ color: muted, opacity: muted ? 1 : 0.75, letterSpacing: "0.08em", textTransform: "uppercase" }}
    >
      {label}
    </Typography>
  </Box>
);

/**
 * The strip under a thumbnail. Painted from the same recipe as the hover card's panel, so the two
 * are one system and the type does not have to invert on a pale sample to stay readable.
 *
 * Rows read bottom-up: the last one carries the figures and anything above it is the context they
 * belong to, which is why only the last is given the full tone. A label builder adding a row is
 * adding context, and belongs above the figures for the same reason.
 */
export const FooterComponent = ({
  labels,
  divider,
  accent,
}: {
  labels: ReactNode[][];
  divider?: boolean;
  accent?: Colour;
}) => {
  const theme = useTheme();
  const palette = accent && artworkPalette(accent, theme);

  return (
    <CardContent
      sx={{
        padding: "10px",
        ":last-child": { paddingBottom: "10px" },
        width: "100%",
        ...(palette && { ...palette.ground, color: palette.onGround, borderTop: palette.seam }),
      }}
    >
      {labels.map((stacks, index) => (
        <Stack
          key={`stacks-${index}`}
          direction="row"
          divider={
            divider ? (
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: palette?.muted, opacity: palette ? 0.4 : 1 }}
              />
            ) : null
          }
          sx={{
            justifyContent: stacks.length === 1 ? "center" : "space-between",
            color: palette && index < labels.length - 1 ? palette.muted : undefined,
          }}
        >
          {stacks.map((val, index) =>
            typeof val === "string" ? (
              <Typography
                key={val}
                variant="subtitle2"
              >
                {val}
              </Typography>
            ) : (
              <div key={index}>{val}</div>
            ),
          )}
        </Stack>
      ))}
    </CardContent>
  );
};

export const Segment = ({
  percent,
  backgroundColour,
  spacing = 2,
  sx,
  ...props
}: {
  percent: number;
  backgroundColour: string;
  spacing?: number;
} & BoxProps) => (
  <Box
    sx={{
      width: `${percent}%`,
      height: (theme) => theme.spacing(spacing),
      backgroundColor: backgroundColour,
      transition: "opacity 0.2s",
      ...sx,
    }}
    {...props}
  />
);

export interface TimelineBand {
  key: string;
  /** Offset from the left edge of the strip, as a percentage of its full width. */
  startPercent: number;
  widthPercent: number;
  /** Row within the strip, from `buildStrip`. Bands sharing a lane never overlap. */
  lane: number;
  colour: string;
  tooltip?: ReactNode;
  /** Context rather than the subject of the card, drawn dimmer. */
  muted?: boolean;
  /** The span is an estimate, drawn so its edges do not read as dates. */
  imprecise?: boolean;
}

const STRIP_HEIGHT = 3;

/**
 * A proportional strip of tracked spans against a fixed scale — the seasons of a show, the games
 * in a franchise.
 *
 * Bands are positioned rather than chained, so the shell owns the whole coordinate space and a
 * caller cannot couple to it: everything here reads `startPercent` and `widthPercent` off
 * `buildStrip` and never asks how they were arrived at.
 */
export const TimelineCard = ({
  bands,
  laneCount,
  ticks,
  caption,
}: {
  bands: TimelineBand[];
  laneCount: number;
  ticks: TimelineTick[];
  caption?: ReactNode;
}) => {
  const palette = useContext(ArtworkPalette);

  return (
    <Grid size={12}>
      <Card
        variant="elevation"
        sx={{ height: "100%", background: "unset", color: "unset" }}
      >
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 1 },
            height: "100%",
            padding: 1,
            paddingTop: 0,
          }}
        >
          {caption && (
            <Typography
              variant="caption"
              sx={{ display: "block", opacity: 0.7, paddingBottom: 0.5 }}
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
              backgroundColor: palette?.tile ?? "action.disabledBackground",
            }}
          >
            <TimelineScale
              ticks={ticks}
              line={palette?.line}
            />
            {bands.map((band) => (
              <TimelineBandBox
                {...band}
                laneCount={laneCount}
                key={band.key}
              />
            ))}
          </Box>
          <TimelineAxis ticks={ticks} />
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
const TimelineScale = ({ ticks, line }: { ticks: TimelineTick[]; line?: string }) => (
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
          backgroundColor: line ?? "divider",
          opacity: line ? 1 : 0.7,
        }}
      />
    ))}
  </Box>
);

/** Sparse enough that the labels do not collide at card width, and land on round years. */
const LABEL_EVERY_YEARS = 5;

const TimelineAxis = ({ ticks }: { ticks: TimelineTick[] }) => (
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
          {`\u2019${(tick.year % 100).toString().padStart(2, "0")}`}
        </Typography>
      ))}
  </Box>
);

const FADED_ENDS = "linear-gradient(to right, transparent, #000 25%, #000 75%, transparent)";

/** Of the lane, so lanes stay visibly separate whatever the strip is divided into. */
const LANE_PADDING = 0.08;
/** Of the whole strip, and only when there is one lane to inset within. */
const MUTED_INSET = 0.2;

const TimelineBandBox = ({
  startPercent,
  widthPercent,
  lane,
  laneCount,
  colour,
  tooltip,
  muted,
  imprecise,
}: TimelineBand & { laneCount: number }) => {
  const laneHeight = 100 / laneCount;
  // On a single lane the card's own game keeps the full height and its siblings are inset, which
  // is the clearest reading of "this one, among these". Once the strip is divided there is no
  // height left to spend on that — a sibling inset within an eight-pixel lane is a hairline — so
  // every band fills its lane and the distinction falls to opacity alone.
  const inset = laneCount > 1 ? laneHeight * LANE_PADDING : muted ? 100 * MUTED_INSET : 0;

  return (
    <Tooltip
      title={tooltip}
      placement="top"
      disableHoverListener={!tooltip}
      disableTouchListener={!tooltip}
    >
      <Box
        sx={{
          position: "absolute",
          left: `${startPercent}%`,
          width: `${widthPercent}%`,
          // Hover leaves every box where it is: growing one reflows the row under the pointer,
          // and a transition on it never advances, because the tooltip opening re-renders the
          // strip and restarts the clock every frame.
          top: `${lane * laneHeight + inset}%`,
          height: `${laneHeight - inset * 2}%`,
          backgroundColor: colour,
          opacity: muted ? 0.6 : 1,
          // An estimated span dissolves at both ends rather than stopping at one, because a hard
          // edge is a date and this band does not have one. Square-cut too, so the rounded caps
          // stay the mark of a span the sheet actually pinned down.
          ...(imprecise && {
            maskImage: FADED_ENDS,
            WebkitMaskImage: FADED_ENDS,
          }),
          // The card's own game against its context. Opacity alone does not carry it once the
          // bands are lane-height: each one is coloured by its own platform, so a dimmed band
          // beside a differently-coloured one reads as a different platform rather than as
          // context. `currentColor` is the ground's contrast text, so the ring lands legibly on
          // an extracted artwork colour whichever way that fell.
          boxShadow: muted ? undefined : "inset 0 0 0 1px currentColor",
          borderRadius: imprecise ? 0 : 0.5,
          "&:hover": { opacity: 1, filter: "brightness(1.25)" },
        }}
      />
    </Tooltip>
  );
};
