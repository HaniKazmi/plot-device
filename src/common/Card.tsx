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
  type TypographyProps,
} from "@mui/material";
import { type FunctionComponent, type ReactElement, type ReactNode, useEffect, useRef, useState } from "react";
import { CalendarMonthOutlined } from "@mui/icons-material";
import { cachedColour, extractColourFrom } from "../utils/colourUtils";
import { ArtworkAccent, artworkPalette, useArtworkPalette } from "./artworkPalette";
import { HoverCardTooltip } from "./HoverCardTooltip";
import { CardArrangementProvider, shapeToAspect, useCardArrangement, type ArtworkShape } from "./cardArrangement";
import { shortYear } from "./date";
import { LABEL_SX } from "./typography";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import type { Colour } from "../utils/types";
import type { TimelineTick } from "./timelineLayout";
import type { StripBand, StripSpan } from "./timelineStripData";

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
  /**
   * The card itself rather than the artwork inside it. A caller that lays the artwork and a panel
   * out against each other — the hero — owns that axis, and only the card can carry it.
   */
  cardSx?: SxProps<Theme>;
  landscape?: boolean;
  /**
   * `"aside"` for a card whose panel sits beside the image and has to be given the remaining
   * width; left off, the artwork column is the width of the card.
   */
  mediaLayout?: "aside";
  /**
   * The shape of the artwork, for a surface holding more than one of them: the card then reserves
   * that shape before the image loads and arranges itself by it — a poster takes its words in a
   * column beside it, a banner stacks them underneath.
   *
   * The Omnibus is the surface that needs it, because a mixed row is where a single arrangement
   * fails: a banner is four times as wide as it is tall, so words beside it get a sliver of a
   * column, while a poster is half as wide as it is tall, so the strip beneath it is a hundred
   * pixels across and clamps every title to three characters. A tab whose artwork is all one shape
   * has no such row and says nothing here, keeping the arrangement its own layout gives it.
   */
  shape?: ArtworkShape;
  /** Derive the card's theme colour from the image once it loads. Costs a canvas read per image. */
  extractColour?: boolean;
}

export type TypedCardMediaImage<T> = FunctionComponent<
  Omit<CardMediaImageProps, "image" | "alt" | "detailComponent"> & { item: T }
>;

/**
 * Everything an image is asked for once it has pixels. At module scope because the effect below
 * calls it too, and a component-scope function is a new value every render — either a dependency
 * that re-runs the effect on each one, or a suppressed rule.
 */
const readImage = (
  img: HTMLImageElement | null,
  extract: boolean,
  setRatio: (ratio: number) => void,
  setExtracted: (colour: Colour) => void,
) => {
  if (!img?.naturalWidth) return;
  setRatio(img.naturalWidth / img.naturalHeight);
  if (extract) extractColourFrom(img, setExtracted);
};

/**
 * The artwork column beside a panel rather than filling the card above one.
 *
 * `CardActionArea` is `width: 100%`, which as a flex item resolves its basis to the whole card:
 * the panel beside it is then dividing up no free space at all, and collapses to the width of its
 * longest word while the artwork sits in a column of empty ground. Basis `auto` against a
 * shrink-to-fit width makes the column however wide the artwork turned out to be at its own
 * height, and the panel takes the rest. `flex-start` ends the column where the artwork does
 * rather than stretching it to a taller panel.
 */
const ASIDE_ACTION_AREA_SX = {
  flex: "0 0 auto",
  width: { xs: "100%", md: "auto" },
  alignSelf: "flex-start",
} as const;

/**
 * The same column, for a card arranged by its artwork's shape rather than by a caller that pinned
 * the artwork's size.
 *
 * The ceiling is what the difference is for. This card's width is imposed on it — a grid cell, a
 * band — and the artwork's own pixels are several times that, so shrink-to-fit alone hands the
 * whole card to the picture and leaves the words nothing. Half is the most a poster can claim, so
 * there is always a column to set a name in. Stretching rather than ending at the artwork, because
 * a card in a band is as tall as the tallest card beside it and a picture that stops short of that
 * leaves a panel of bare ground under itself.
 */
const SHAPE_ASIDE_ACTION_AREA_SX = {
  flex: "0 0 auto",
  width: "auto",
  maxWidth: "50%",
  alignSelf: "stretch",
} as const;

/** Artwork filling a column it did not choose the width of, at its own ratio and uncropped. */
const SHAPE_ASIDE_MEDIA_SX = { maxWidth: "100%", height: "auto", display: "block" } as const;

export const CardMediaImage = (props: CardMediaImageProps) => {
  const { image, alt, chip, colour: propColour, footerComponent, detailComponent, mediaLayout, sx, cardSx } = props;
  // Defaults are read off `props` rather than written in the destructuring pattern: a default
  // there is an assignment the React Compiler cannot lower, and it bails the whole component out
  // of memoization — silently, since the code still runs. `extractColour` must resolve before the
  // `useState` initialiser below that reads it.
  const lazy = props.lazy ?? false;
  const landscape = props.landscape ?? false;
  const extractColour = props.extractColour ?? false;
  const shape = props.shape;
  /**
   * A card with no words is not arranged at all. The rule divides the card between a picture and a
   * column of text, so applying it to bare artwork hands half the card to a panel that is not there
   * and draws the picture at half the size it was given room for — which is what a shelf of pictures
   * at one height is.
   */
  const beside = shape === "portrait" && footerComponent !== undefined;
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
  // value it mounted with. `||` rather than `??`: colour lookups answer `""` for a value outside
  // their vocabulary, and the empty string reaching `getContrastText` through the chip's fallback
  // chain throws and takes the whole page down — "no colour" has to mean `undefined` from here on.
  const colour = propColour || extracted;
  /**
   * The artwork's shape, which is what lets the dialog scale it up to the viewport rather than
   * only down. Held as the ratio rather than as the decision it feeds, so the decision can be left
   * to CSS and re-made on a resize or a rotation without a listener.
   */
  const [ratio, setRatio] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);

  const theme = useTheme();
  const palette = artworkPalette(colour, theme);

  const readColour = (img: HTMLImageElement | null) => {
    if (img && !colour) extractColourFrom(img, setExtracted);
  };

  // `load` does not bubble, so React delivers it through a root listener that only sees events
  // dispatched once the element is in the document. An image served from cache can finish before
  // that, and then `onLoad` never runs and nothing else would ever ask it for a colour or a shape.
  // Checking the element after commit covers that case; `complete` with a non-zero `naturalWidth`
  // means the image is there to be read whether or not the event arrived.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) readImage(img, extractColour && !colour, setRatio, setExtracted);
  }, [extractColour, colour, image]);

  return (
    <ArtworkAccent.Provider value={colour}>
      <CardArrangementProvider value={beside ? "beside" : "stacked"}>
        <Card
          variant="elevation"
          // The array form rather than a spread: `SxProps` is also legally a function or an array,
          // neither of which survives being spread into an object literal.
          sx={[
            {
              height: "100%",
              position: "relative",
              backgroundColor: palette.ground,
              display: landscape || beside ? "flex" : undefined,
              color: palette.onGround,
            },
            ...(Array.isArray(cardSx) ? cardSx : [cardSx]),
          ]}
        >
          <CardActionArea
            sx={mediaLayout === "aside" ? ASIDE_ACTION_AREA_SX : beside ? SHAPE_ASIDE_ACTION_AREA_SX : undefined}
          >
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
              onLoad={(el) => readImage(el.currentTarget, extractColour && !colour, setRatio, setExtracted)}
              // The shape's own rules first and the caller's after them, so a caller that pins a
              // height still wins and one that pins nothing gets the reservation and the column
              // sizing without asking. A card that named no shape is left exactly as its caller
              // dressed it.
              sx={[
                ...(shape ? [{ aspectRatio: shapeToAspect(shape), ...(beside && SHAPE_ASIDE_MEDIA_SX) }] : []),
                ...(Array.isArray(sx) ? sx : [sx]),
              ]}
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
                backgroundColor: palette.ground,
                color: palette.onGround,
              }}
            >
              <Box
                onClick={() => setDialogOpen(false)}
                sx={{
                  position: "relative",
                }}
              >
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
                  // The same line every other surface draws where it meets the artwork it was
                  // sampled from. A gradient fading the image into the ground did the joining
                  // before, which reads as the artwork running out rather than as one card in two
                  // parts — and spent the bottom tenth of every image to do it.
                  borderTop: palette.seam,
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
      </CardArrangementProvider>
    </ArtworkAccent.Provider>
  );
};

export const DetailCard = ({ label, value }: { label: string; value: string | ReactNode }) => {
  const palette = useArtworkPalette();

  if (!value) return null;
  return (
    <Grid
      size={{
        xs: 6,
        md: 3,
      }}
    >
      {/* Elevated, against the theme's outlined default: the outlined variant draws a `divider`
          hairline, a neutral grey laid over whatever ground the artwork turned out to be. A wash
          of the card's own contrast colour instead, so a tile lifts off a pale sample as readily
          as off a dark one — a raised edge alone all but disappears against a light ground. */}
      <Card
        variant="elevation"
        sx={{
          height: "100%",
          background: palette.tile,
          // A `Paper` paints `text.primary` of its own, which is the theme's colour and not the
          // one the dialog's card derived from its artwork. Unset lets that contrast colour reach
          // the tile, so the type turns over with the ground rather than against it.
          color: "unset",
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
              sx={{ color: palette.muted }}
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
 * A figure and what it counts, as a panel carries them: a headline number over its label.
 */
export interface PanelStat {
  value: number | string;
  label: string;
}

/**
 * One segment of a panel's subtitle — "Apple TV", "Thriller" — with the swatch the app already
 * speaks that segment's colour in, where it has one. Parts with no text are dropped, so a caller
 * lists its fields without testing which the sheet filled in.
 */
export interface PanelSubtitlePart {
  text: string;
  swatch?: Colour;
}

/**
 * How a panel sits against the artwork it belongs to, which decides the edge the two share and
 * whether the panel has height to spend.
 *
 * A panel left to itself follows the card it is inside: a card arranged by its artwork's shape
 * publishes that arrangement and the panel reads it, so the two halves of one card cannot come to
 * disagree about which way round they are. Naming it is for a caller whose layout says something
 * the card does not — the hero's breakpoint-dependent arrangement, or a tooltip laid out by hand.
 *
 * - `beneath` — under the artwork, as tall as its own type. Nothing to distribute.
 * - `beside` — next to a poster, and as tall as it. Three lines against a 2:3 poster leaves
 *   better than half the column empty, so the title takes the top and the figures the bottom
 *   edge, spending that height as structure rather than leaving it as a pool around the middle.
 * - `hero` — beside the artwork once there is width for it and beneath it on a phone, with the
 *   seam rotating to the edge the two actually share. The height is spent the way `beside`
 *   spends it — title at the top, tiles on the bottom edge — so the hero and the hover cards
 *   read as one treatment at two sizes.
 */
export type PanelLayout = "beneath" | "beside" | "hero";

/**
 * The panel beside or beneath a card's artwork: what the item is, when, and how much of it.
 *
 * One recipe for every card that carries words on a sampled ground — the timeline's hover cards
 * and the page's hero alike — because a second implementation of the same palette is two things
 * to keep in step.
 */
export const CardPanel = ({
  kicker,
  title,
  titleVariant,
  subtitle,
  dateRange,
  stats,
  layout,
  minHeight,
}: {
  /** The line above the title, saying why this item is the one being shown. */
  kicker?: string;
  title: string;
  titleVariant?: TypographyProps["variant"];
  /** Plain prose, or parts carrying the swatches a legend elsewhere honours. */
  subtitle?: string | PanelSubtitlePart[];
  /** Absent where the card names its dates some other way, as the hero's kicker does. */
  dateRange?: string;
  stats: PanelStat[];
  /** Only where the caller's layout says something its card does not. */
  layout?: PanelLayout;
  /** Holds the panel to the artwork's height, so the card is the height of the picture in it. */
  minHeight?: number;
}) => {
  const palette = useArtworkPalette();
  const arrangement = useCardArrangement();
  const resolved = layout ?? (arrangement === "beside" ? "beside" : "beneath");
  const beside = resolved === "beside";
  const hero = resolved === "hero";

  return (
    <CardContent
      sx={{
        display: "flex",
        flexDirection: "column",
        // Beside or hero, the panel is as tall as the artwork and a few lines cannot fill it, so
        // the title takes the top edge and the figures the bottom, spending that height as
        // structure rather than pooling it around a centred block. A stacked panel is the height of
        // its own lines and has nothing to distribute — spreading them to fill a taller box pulls
        // the kicker off its title and opens a gap above the figures, which is the wrong way to use
        // spare height. Where a stacked card has any, it belongs to the picture.
        justifyContent: beside || hero ? "space-between" : "flex-start",
        gap: 2,
        // Basis zero and free to grow, so a panel beside the artwork is exactly the row minus the
        // artwork column rather than a share of it.
        ...(hero ? { flex: "1 1 0" } : { width: "100%" }),
        // A flex item's floor is its content's intrinsic width. Without this a long title sets
        // that floor to the width of its longest word and the panel refuses to wrap or shrink.
        minWidth: 0,
        ...(minHeight && { minHeight: { md: minHeight } }),
        ":last-child": { paddingBottom: 2 },
        backgroundColor: palette.ground,
        color: palette.onGround,
        // Where the artwork meets the panel, so the two read as one card rather than as one pasted
        // onto the other. One edge, never both, and the hero's rotates with its own layout.
        // Written out rather than as one computed key, which the React Compiler cannot lower and
        // bails on — taking every card in the app out of memoization with it.
        ...(hero
          ? { borderTop: { xs: palette.seam, md: "none" }, borderLeft: { xs: "none", md: palette.seam } }
          : beside
            ? { borderLeft: palette.seam }
            : { borderTop: palette.seam }),
      }}
    >
      <Stack
        spacing={0.5}
        sx={{ alignItems: "flex-start" }}
      >
        {kicker && (
          <Typography
            variant="caption"
            sx={{ color: palette.muted, ...LABEL_SX }}
          >
            {kicker}
          </Typography>
        )}
        <Typography
          variant={titleVariant ?? "h6"}
          // A title long enough to have no break opportunity would otherwise set the panel's
          // intrinsic width and push itself out past the card's edge.
          sx={{ fontWeight: 700, lineHeight: 1.2, overflowWrap: "break-word", width: "100%" }}
        >
          {title}
        </Typography>
        {/* Part of what the thing is called, but not the part the chart labels its bar with, so
            it sits under the title in the same tone the dates take. */}
        {subtitle &&
          (Array.isArray(subtitle) ? (
            // Each part is one box rather than three loose ones, because a line break falls between
            // flex items: with the swatch, the separator and the text each an item of the wrapping
            // row, a narrow column breaks a mark off the thing it marks and leaves a separator
            // hanging at the end of a line. Grouped, the only place a break can fall is between
            // parts, and the separator leads its own part so it travels with the words it joins.
            <Box
              sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 0.75, color: palette.muted }}
            >
              {subtitle
                .filter((part) => part.text)
                .map((part, index) => (
                  <Box
                    key={part.text}
                    // The floor is what lets a part longer than the whole column wrap inside
                    // itself rather than push the row wider than the card.
                    sx={{ display: "inline-flex", alignItems: "center", columnGap: 0.75, minWidth: 0 }}
                  >
                    {index > 0 && <Typography variant="body2">·</Typography>}
                    {part.swatch && (
                      <Swatch
                        colour={part.swatch}
                        size={INLINE_SWATCH_SIZE}
                      />
                    )}
                    <Typography
                      variant="body2"
                      sx={{ overflowWrap: "anywhere" }}
                    >
                      {part.text}
                    </Typography>
                  </Box>
                ))}
            </Box>
          ) : (
            <Typography
              variant="body2"
              sx={{ color: palette.muted }}
            >
              {subtitle}
            </Typography>
          ))}
        {dateRange && (
          <Stack
            direction="row"
            spacing={0.75}
            sx={{ alignItems: "center", color: palette.muted }}
          >
            <CalendarMonthOutlined sx={{ fontSize: 16 }} />
            <Typography variant="body2">{dateRange}</Typography>
          </Stack>
        )}
      </Stack>

      {stats.length > 0 && <StatTileGrid stats={stats} />}
    </CardContent>
  );
};

/**
 * A figure and what it counts, plus the colour the app already speaks that figure in where it has
 * one — a status, which is a fill in every chart on the tab.
 */
export interface CardStat extends PanelStat {
  colour?: Colour;
}

/**
 * A row of figures: two per row where there is only a phone's width, one row of all of them once
 * there is width for it.
 *
 * One rule wherever tiles appear — a panel's, an expanded card's — because two grids that wrapped
 * at different counts would put the same two figures on one line in one place and two in another.
 */
const StatTileGrid = ({ stats, size }: { stats: CardStat[]; size?: "hero" }) => {
  const beside = useCardArrangement() === "beside";

  return (
    <Box
      sx={{
        display: "grid",
        // Beside a poster the row is a column's width rather than a card's, and a third tile in it
        // is narrower than the word under the figure — the label then sets the grid's floor and the
        // last tile is pushed past the card's edge. Fitting as many as the column holds and wrapping
        // the rest keeps every figure the panel was given, which the alternative — carrying fewer
        // beside than beneath — does not.
        gridTemplateColumns: beside
          ? `repeat(auto-fit, minmax(${BESIDE_TILE_FLOOR}px, 1fr))`
          : {
              xs: `repeat(${Math.min(stats.length, 2)}, 1fr)`,
              sm: `repeat(${stats.length}, 1fr)`,
            },
        gap: 1,
        width: "100%",
      }}
    >
      {stats.map((stat) => (
        <StatTile
          key={stat.label}
          {...stat}
          size={size}
        />
      ))}
    </Box>
  );
};

/** Wide enough for a figure and the word under it, which is what decides how many share a row. */
const BESIDE_TILE_FLOOR = 72;

/** A figure and what it counts, set apart from the prose so the numbers can be read at a glance. */
export const StatTile = ({ value, label, colour, size }: CardStat & { size?: "hero" }) => {
  const palette = useArtworkPalette();

  return (
    <Box
      sx={{
        flex: 1,
        padding: 1,
        borderRadius: 1,
        textAlign: "center",
        // A tile carrying a colour of its own paints it, exactly as the chip in a card's corner
        // does. The rest take a wash of the ground's own contrast colour, so they lift off a pale
        // sample as readily as off a dark one.
        backgroundColor: colour ?? palette.tile,
        color: (theme) => (colour ? theme.palette.getContrastText(colour) : undefined),
      }}
    >
      <Typography
        component="div"
        // Tabular figures so a row of tiles lines its digits up rather than shifting with the
        // widths of whichever numerals the data happened to produce.
        sx={{
          fontWeight: 700,
          fontSize: size === "hero" ? "1.5rem" : "1.25rem",
          lineHeight: 1.2,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {typeof value === "number" ? format(value) : value}
      </Typography>
      <Typography
        variant="caption"
        // A coloured tile's caption is its own contrast text held back, because `muted` is mixed
        // from the card's ground and this tile is not sitting on it.
        sx={{ color: colour ? undefined : palette.muted, opacity: colour ? 0.8 : 1, ...LABEL_SX }}
      >
        {label}
      </Typography>
    </Box>
  );
};

/**
 * The figures an expanded card leads with, directly under its strip: the two or three numbers
 * that answer "how much of this was there?" before any of the prose beneath is read.
 *
 * Callers pass only the stats they actually hold. A tile reading zero because the sheet recorded
 * nothing says something false where saying nothing says the truth, so the omission is the
 * caller's to make and this shell lays out whatever it is handed.
 */
export const HeroStatRow = ({ stats }: { stats: CardStat[] }) => {
  if (stats.length === 0) return null;

  return (
    <Grid size={12}>
      <StatTileGrid
        stats={stats}
        size="hero"
      />
    </Grid>
  );
};

/**
 * The mark a legend puts beside a name.
 *
 * It appears exactly where the app already speaks that field's colour somewhere else — a platform,
 * a franchise, a genre, a rating, a status. A swatch on a field with no colour vocabulary invents
 * one, and then the reader has learnt a legend that no chart honours.
 *
 * `size` is the caller's because the mark is read against what it sits beside: 10 on a line of
 * body text, larger in a ranked column where it is the row's leading element.
 */
export const Swatch = ({ colour, size }: { colour: string; size: number }) => (
  <Box
    component="span"
    sx={{
      flexShrink: 0,
      width: size,
      height: size,
      borderRadius: 0.5,
      backgroundColor: colour,
    }}
  />
);

/** A swatch on a line of prose, small enough not to outweigh the text it marks. */
export const INLINE_SWATCH_SIZE = 10;

/** One fact about an item: what it is called, what it says, and its colour where it has one. */
export interface LedgerRow {
  label: string;
  value: ReactNode;
  /** Only where a chart or a chip elsewhere in the app already paints this field. */
  swatch?: Colour;
}

/**
 * The facts about an item that are not figures, as a ledger rather than as tiles.
 *
 * A grid of equal tiles gives a game's publisher the same weight as its hours, which is the one
 * thing the reader is least likely to have opened the card for. Label and value on one line reads
 * at a glance and costs a fifth of the height, which is what leaves room for the figures above to
 * be large.
 *
 * Two columns are CSS columns rather than a grid because the rows are independent: a grid would
 * hold each pair to the tallest row on it, and a value that wraps would open a gap beside it.
 * `break-inside` is what keeps a row from being split across the column boundary.
 */
export const MetadataLedger = ({ rows }: { rows: LedgerRow[] }) => {
  const palette = useArtworkPalette();

  if (rows.length === 0) return null;

  return (
    <Grid size={12}>
      <Box sx={{ columnCount: { xs: 1, md: 2 }, columnGap: 3 }}>
        {rows.map((row) => (
          <Box
            key={row.label}
            sx={{
              breakInside: "avoid",
              display: "flex",
              alignItems: "baseline",
              justifyContent: "space-between",
              gap: 2,
              paddingY: 0.75,
              borderBottom: `1px solid ${palette.line}`,
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: palette.muted, flexShrink: 0, ...LABEL_SX }}
            >
              {row.label}
            </Typography>
            <Stack
              direction="row"
              spacing={0.75}
              // Centred against the line rather than sat on its baseline: a square has no
              // baseline of its own and would hang below the text it belongs to.
              sx={{ alignItems: "center", minWidth: 0 }}
            >
              {row.swatch && (
                <Swatch
                  colour={row.swatch}
                  size={INLINE_SWATCH_SIZE}
                />
              )}
              <Typography
                variant="body2"
                sx={{ textAlign: "right" }}
              >
                {row.value}
              </Typography>
            </Stack>
          </Box>
        ))}
      </Box>
    </Grid>
  );
};

/**
 * The strip under a thumbnail. Painted from the same recipe as the hover card's panel, so the two
 * are one system and the type does not have to invert on a pale sample to stay readable.
 *
 * Rows read bottom-up: the last one carries the figures and anything above it is the context they
 * belong to, which is why only the last is given the full tone. A label builder adding a row is
 * adding context, and belongs above the figures for the same reason.
 *
 * Beside a poster the same rows are read down a column instead of across a strip. A strip's width is
 * the whole card and a column's is what the artwork left, so the row that fits on one line under a
 * banner is three or four words wide here — the names are given lines to wrap onto, and a ceiling
 * that stops one from outgrowing the picture it belongs to.
 */
const BESIDE_LABEL_LINES = 3;

export const FooterComponent = ({ labels, divider }: { labels: string[][]; divider?: boolean }) => {
  const palette = useArtworkPalette();
  const beside = useCardArrangement() === "beside";

  return (
    <CardContent
      sx={{
        padding: "10px",
        ":last-child": { paddingBottom: "10px" },
        // Basis zero and free to grow, so the column is exactly the card minus the artwork rather
        // than a share of it; the floor is what lets a long word wrap instead of setting the width.
        ...(beside ? { flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column" } : { width: "100%" }),
        // Centred against the artwork's height, which is what the card's height is. Under a banner
        // there is no spare height to place the rows in.
        ...(beside && { justifyContent: "center" }),
        backgroundColor: palette.ground,
        color: palette.onGround,
        // The one edge the two halves share. Written out rather than as one computed key, which the
        // React Compiler cannot lower — and bailing here takes every card in the app with it.
        ...(beside ? { borderLeft: palette.seam } : { borderTop: palette.seam }),
      }}
    >
      {labels.map((stacks, index) => (
        <Stack
          key={`stacks-${index}`}
          direction="row"
          divider={
            divider && !beside ? (
              <Divider
                orientation="vertical"
                flexItem
                sx={{ borderColor: palette.line }}
              />
            ) : null
          }
          sx={{
            // Beside, a row opens a line of prose; under the artwork it is spread across the card.
            justifyContent: beside ? "flex-start" : stacks.length === 1 ? "center" : "space-between",
            columnGap: beside ? 0.75 : 0,
            flexWrap: beside ? "wrap" : "nowrap",
            color: index < labels.length - 1 ? palette.muted : undefined,
          }}
        >
          {stacks.map((val) => (
            <Typography
              key={val}
              variant="subtitle2"
              sx={
                beside
                  ? {
                      lineHeight: 1.3,
                      overflowWrap: "break-word",
                      minWidth: 0,
                      display: "-webkit-box",
                      WebkitBoxOrient: "vertical",
                      WebkitLineClamp: BESIDE_LABEL_LINES,
                      overflow: "hidden",
                    }
                  : undefined
              }
            >
              {val}
            </Typography>
          ))}
        </Stack>
      ))}
    </CardContent>
  );
};

export const Segment = ({
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
        transition: "opacity 0.2s",
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
 * with it, so both halves read one `hovered` name.
 */
const BAR_HEIGHT = 1.5;

export const ProportionalBar = ({
  items,
  hovered,
  onHover,
}: {
  items: { name: string; percent: number; colour: string }[];
  hovered: string | null;
  onHover: (name: string | null) => void;
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
        onMouseEnter={() => onHover(item.name)}
        onMouseLeave={() => onHover(null)}
        sx={{
          borderRadius: 0.5,
          opacity: hovered && hovered !== item.name ? 0.3 : 1,
          // A segment answers a hover and nothing else. A pointer cursor here promises a drilldown
          // that does not exist, and the dim already says the segment is live.
          cursor: "default",
        }}
      />
    ))}
  </Stack>
);

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
  const palette = useArtworkPalette();

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
              // One line, whatever the name in it turned out to be: a caption that wraps pushes
              // the strip down by its own height, and the strip is what the card is measuring.
              noWrap
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
const TimelineScale = ({ ticks }: { ticks: TimelineTick[] }) => {
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
          {shortYear(tick.year)}
        </Typography>
      ))}
  </Box>
);

const FADED_ENDS = "linear-gradient(to right, transparent, #000 25%, #000 75%, transparent)";

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
  children: ReactElement;
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
          // an extracted artwork colour whichever way that fell. A caller with no subject to
          // single out — the ribbon, where every mark is a peer — opts out with `frameless`:
          // on a mark floored to a couple of pixels the ring would be most of the mark, burying
          // the fill it exists to set apart.
          boxShadow: muted || frameless ? undefined : "inset 0 0 0 1px currentColor",
          borderRadius: imprecise ? 0 : 0.5,
          "&:hover": { opacity: 1, filter: "brightness(1.25)" },
        }}
      />
    </BandTooltip>
  );
};
