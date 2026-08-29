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
  type ChipProps,
} from "@mui/material";
import { type FunctionComponent, type ReactNode, useEffect, useRef, useState } from "react";
import { cachedColour, extractColourFrom, withAlpha } from "../utils/colourUtils";
import Grid from "@mui/material/Grid";
import type { Colour } from "../utils/types";
import type { TimelineTick } from "./timelineLayout";

export interface CardMediaImageProps {
  image?: string;
  alt: string;
  colour?: Colour;
  chip?: Pick<ChipProps, "label" | "icon" | "onClick" | "variant"> & { colour?: Colour };
  lazy?: boolean;
  footerComponent?: ReactNode;
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
      {footerComponent}
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
  if (!value) return null;
  return (
    <Grid
      size={{
        xs: large ? 12 : 6,
        md: large ? 6 : 3,
      }}
    >
      {/* Elevated, against the theme's outlined default. These cards paint their own ground — an
          extracted artwork colour, or `unset` so the tinted panel behind shows through — and the
          outlined variant draws a `divider` hairline, a neutral grey laid over whatever that ground
          turns out to be. A raised edge is what separates a tile here. */}
      <Card
        variant="elevation"
        sx={{
          height: "100%",
          background: colour ?? "unset",
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
              sx={{ opacity: 0.8 }}
            >
              {label}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export const FooterComponent = ({
  labels,
  divider,
  justify,
}: {
  labels: ReactNode[][];
  divider?: boolean;
  justify?: boolean;
}) => (
  <CardContent
    sx={{
      padding: "10px",
      ":last-child": { paddingBottom: "10px" },
      width: "100%",
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
            />
          ) : null
        }
        sx={{
          justifyContent: stacks.length === 1 ? "center" : justify ? "space-around" : "space-between",
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
}) => (
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
            backgroundColor: "action.disabledBackground",
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
        <TimelineAxis ticks={ticks} />
      </CardContent>
    </Card>
  </Grid>
);

/**
 * A gridline per year, so a band can be read against a date without hovering it.
 *
 * Lines only. Shading alternate years the way the full timeline does works there because the
 * chart is hundreds of pixels tall; on a strip this short the filled years read as bars and
 * compete with the bands they exist to measure — most of all on a card whose ground is an
 * extracted artwork colour, where they pick that colour up.
 */
const TimelineScale = ({ ticks }: { ticks: TimelineTick[] }) => (
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
          backgroundColor: "divider",
          opacity: 0.7,
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
