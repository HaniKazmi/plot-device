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
import {
  CardArrangementProvider,
  shapeToArrangement,
  shapeToAspect,
  useCardArrangement,
  type ArtworkShape,
} from "./cardArrangement";
import { shortYear } from "./date";
import { useDialogMount } from "./useDialogMount";
import { dimSx, LABEL_SX } from "./typography";
import { FADE_Z } from "./ScrollFade";
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
  /**
   * `display: flex` on the card, and nothing else.
   *
   * It puts the artwork and the panel in one flex container, for a caller that has already sized
   * both — the hero and the two hover cards. Which way that container runs is the caller's, since
   * only `cardSx` carries a direction: the hero turns it to a column below `md`, where the panel
   * has no width to take. It reserves no shape, sizes no artwork column and picks no
   * arrangement: those are `shape` and `mediaLayout` below, and a caller wanting the panel to take
   * the width the artwork did not says `mediaLayout="aside"` as well. With no `footerComponent`
   * there is one flex item, so the flag then decides only how that item resolves its height.
   */
  landscape?: boolean;
  /**
   * Where the panel sits, for a caller that has pinned its own artwork size and so owns the
   * arrangement (§6, `common/cardArrangement.ts`).
   *
   * `"aside"` puts the panel beside the image and gives it the remaining width. `"stacked"` keeps
   * the panel underneath whatever shape the artwork is, for a surface that has pinned a height
   * and wants a poster's words under it rather than beside: the shape rule would seat them in a
   * column, and a row mixing banners with posters would then hold two card layouts at two widths.
   * Left off, the arrangement follows `shape`, and the artwork column is the width of the card.
   */
  mediaLayout?: "aside" | "stacked";
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
  /**
   * The one size every card in a row stands at, for a row mixing artwork shapes.
   *
   * A grid gives every card one width and lets the heights fall where the shapes put them, so a
   * row mixing banners with posters is as tall as its tallest card and the rest carry a strip of
   * their own ground. Given both dimensions, the card spends them the way the Now band does at its
   * own scale: a poster or a cover fills the height and takes its own width, and the column of
   * words beside it is whatever the width leaves; a banner fills the width at its ratio and keeps
   * a footer underneath. Every card is then one size, every picture whole, and the words are what
   * gives way. Needs `shape`, which is what says which of the two it is.
   *
   * The footer's height travels with the size because the caller is what draws the footer: this
   * card subtracts it from the picture under a banner and holds the footer to it, and knows
   * nothing else about what is in it.
   */
  rowSize?: { width: number; height: number; footerHeight: number };
  /**
   * A band naming the picture along the top of the whole card, and how tall it is.
   *
   * For a surface that has to say something about the picture the artwork alone cannot — which
   * medium it is, on a row mixing four — without covering it the way the corner chip does. The
   * height travels with it because a sized card spends its height on the picture, and the band is
   * the one other thing in the picture's way.
   */
  mediaBand?: { node: ReactNode; height: number };
  /**
   * Derive the card's theme colour from the image once it loads. Costs a canvas read per image.
   * Given alongside `colour`, the card wears `colour` and its expanded dialog wears the sample.
   */
  extractColour?: boolean;
}

/**
 * The stacked `FooterComponent` at one line a row — its 10px insets, a caption line, a `subtitle2`
 * line and the seam. A list that sizes its cards and draws that footer states this as the
 * `footerHeight` of every `rowSize` it hands out, so the picture under a banner is the card's
 * height less exactly that. Nothing here reads it: a caller drawing a taller footer states a
 * taller height.
 */
export const ROW_FOOTER_HEIGHT = 65;

/**
 * How a list states the band its cards wear: what to draw for an item, and how tall it is. The
 * list turns it into each card's `mediaBand`.
 */
export interface MediaBand<T> {
  render: (item: T) => ReactNode;
  height: number;
}

export type TypedCardMediaImage<T> = FunctionComponent<
  Omit<CardMediaImageProps, "image" | "alt" | "detailComponent"> & { item: T }
>;

/**
 * A sampled colour together with the artwork it was sampled from.
 *
 * The pairing is what makes the answer follow the `image` prop. Extraction lands asynchronously
 * into state, so a bare colour there outlives the picture it describes: a card whose `image`
 * changes under it — the hero, promoting a different item — would keep painting itself from the
 * artwork it no longer shows, with nothing to say the two had come apart.
 */
type ExtractedColour = { image: string | undefined; colour: Colour };

/**
 * Everything an image is asked for once it has pixels. At module scope because the effect below
 * calls it too, and a component-scope function is a new value every render — either a dependency
 * that re-runs the effect on each one, or a suppressed rule. The pairing closure is built here for
 * the same reason.
 */
const readImage = (
  img: HTMLImageElement | null,
  image: string | undefined,
  extract: boolean,
  setRatio: (ratio: number) => void,
  setExtracted: (extracted: ExtractedColour) => void,
) => {
  if (!img?.naturalWidth) return;
  setRatio(img.naturalWidth / img.naturalHeight);
  if (extract) extractColourFrom(img, (colour) => setExtracted({ image, colour }));
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
 * The width is what the difference is for. This card's width is imposed on it — a grid cell, a
 * band — and the artwork's own pixels are several times that, so shrink-to-fit alone hands the
 * whole card to the picture and leaves the words nothing. Half is what a poster claims, so there is
 * always a column to set a name in. It is stated rather than left as a ceiling because the shape's
 * reservation resolves against it: a lazily loaded picture has no width of its own until its file
 * arrives, and a column sized to that picture is nothing tall until then — a row of such cards
 * opens as strips of text and jumps to its height as the pictures stream in. Stretching rather
 * than ending at the artwork, because a card in a band is as tall as the tallest card beside it
 * and a picture that stops short of that leaves a panel of bare ground under itself.
 */
const SHAPE_ASIDE_ACTION_AREA_SX = {
  flex: "0 0 auto",
  width: "50%",
  alignSelf: "stretch",
} as const;

/**
 * Artwork filling the column above, at its own ratio and uncropped: the width is the column's, so
 * the reservation has a height before the file arrives, and the file's own ratio then sets the
 * height it stands at.
 */
const SHAPE_ASIDE_MEDIA_SX = { width: "100%", height: "auto", display: "block" } as const;

/**
 * The footer under a banner in a row of one card size: the height the row stated for it, every
 * line held to one, so a long title is clipped to its line rather than wrapping the card past the
 * row.
 */
const rowFooterSx = (height: number) =>
  ({
    height,
    overflow: "hidden",
    "& .MuiTypography-root": { whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" },
  }) as const;

export const CardMediaImage = (props: CardMediaImageProps) => {
  const { image, alt, chip, colour: propColour, footerComponent, detailComponent, mediaLayout, sx, cardSx } = props;
  const rowSize = props.rowSize;
  const mediaBand = props.mediaBand;
  const bandHeight = mediaBand?.height ?? 0;
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
   * and draws the picture at half the size it was given room for.
   *
   * A caller that pinned the artwork's size can also say so outright, which is what `"stacked"` is
   * for: the rule reasons about a card whose width is imposed on it, and a shelf at one fixed
   * height has imposed nothing.
   */
  const beside =
    mediaLayout !== "stacked" &&
    shape !== undefined &&
    shapeToArrangement(shape) === "beside" &&
    footerComponent !== undefined;
  const detail = useDialogMount();
  // Only cards that opted into extraction seed from the cache, so a grid that means to stay
  // uncoloured is not tinted by whatever another component happened to read first.
  const [extracted, setExtracted] = useState<ExtractedColour | undefined>(() => {
    const cached = extractColour ? cachedColour(image) : undefined;
    return cached ? { image, colour: cached } : undefined;
  });
  // Both halves are derived rather than seeded into state, so a card whose props change under it
  // — the same key showing a different item after a refetch — follows them instead of keeping the
  // value it mounted with. The prop half follows `colour`; the sampled half follows `image`, and
  // a sample read for a different picture is absent rather than stale, leaving the card the
  // theme's own ground for the frame it takes to read the new one. `||` rather than `??`: colour
  // lookups answer `""` for a value outside their vocabulary, and the empty string reaching
  // `getContrastText` through the chip's fallback chain throws and takes the whole page down —
  // "no colour" has to mean `undefined` from here on.
  const sampled = extracted && extracted.image === image ? extracted.colour : undefined;
  const colour = propColour || sampled;
  // The expanded card keeps the artwork's own colour whatever the thumbnail was painted: a card
  // given a `colour` and asked to extract is one told apart from its neighbours by a colour that
  // is not its picture's — the Now band's, painted in its tab's bar — and opened, the picture is
  // the whole first screen and its own colour is the one that belongs beside it. A card that was
  // given a colour and never sampled keeps that colour in its dialog too.
  const dialogColour = sampled ?? colour;
  /**
   * The artwork's shape, which is what lets the dialog scale it up to the viewport rather than
   * only down. Held as the ratio rather than as the decision it feeds, so the decision can be left
   * to CSS and re-made on a resize or a rotation without a listener.
   */
  const [ratio, setRatio] = useState<number | undefined>(undefined);
  const imgRef = useRef<HTMLImageElement>(null);
  /**
   * The artwork that did not arrive, paired with the src it was asked for.
   *
   * Paired for the reason the sampled colour is: a card whose `image` changes under it — the hero
   * promoting a different item, a wall refetched — would otherwise keep standing in for a picture
   * it is no longer showing, and nothing would ever ask the new one to load.
   */
  const [failedImage, setFailedImage] = useState<string | undefined>(undefined);
  /**
   * A card with no picture to draw: either the sheet records no artwork — `""` on the three sheets
   * that type the column, absent altogether on a row the API cut short at its last filled cell —
   * or the URL it records answers with nothing.
   *
   * Both are drawn as a tile rather than left to the browser, which renders a broken image as its
   * own icon beside the alt text in a bordered box, at whatever height that text happens to take.
   * On the wall that height is the failure that matters: every offset below the card is measured
   * against a reservation the card no longer honours.
   */
  const missing = !image || failedImage === image;

  const theme = useTheme();
  const palette = artworkPalette(colour, theme);
  const dialogPalette = artworkPalette(dialogColour, theme);

  // Read on a click as well as on load, for a card that never asked for a colour: its dialog is
  // themed from the sample, and a gallery shelf's cards ask for nothing until one is opened. A card
  // given a colour is read only when it also opted in, since its dialog otherwise keeps that colour.
  const readColour = (img: HTMLImageElement | null) => {
    if (img && !sampled && (extractColour || !propColour))
      extractColourFrom(img, (read) => setExtracted({ image, colour: read }));
  };

  // `load` does not bubble, so React delivers it through a root listener that only sees events
  // dispatched once the element is in the document. An image served from cache can finish before
  // that, and then `onLoad` never runs and nothing else would ever ask it for a colour or a shape.
  // Checking the element after commit covers that case; `complete` with a non-zero `naturalWidth`
  // means the image is there to be read whether or not the event arrived.
  useEffect(() => {
    const img = imgRef.current;
    if (img?.complete) readImage(img, image, extractColour && !sampled, setRatio, setExtracted);
  }, [extractColour, sampled, image]);

  /**
   * The box the artwork occupies, whether or not there is artwork to put in it. The shape's own
   * rules first and the caller's after them, so a caller that pins a height still wins and one
   * that pins nothing gets the reservation and the column sizing without asking. A card that named
   * no shape is left exactly as its caller dressed it.
   *
   * One array for the picture and for the tile standing in for a missing one, because a stand-in
   * of some other size is a card that reserves one height and stands at another.
   */
  const mediaSx = [
    ...(shape ? [{ aspectRatio: shapeToAspect(shape), ...(beside && SHAPE_ASIDE_MEDIA_SX) }] : []),
    // The picture at one card size. Beside the words it takes the height and its own width — from
    // the reservation until the file arrives, from the file's ratio after. Under them it takes the
    // width and the height the band and footer leave, which is its own ratio's height exactly when
    // the caller sized the row from it; a banner is an exact shape, so both being stated crops
    // nothing.
    ...(rowSize && shape
      ? [
          beside
            ? { height: rowSize.height - bandHeight, width: "auto" }
            : { width: "100%", height: rowSize.height - bandHeight - rowSize.footerHeight },
        ]
      : []),
    ...(Array.isArray(sx) ? sx : [sx]),
  ];

  return (
    <ArtworkAccent.Provider value={colour}>
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
          // The band spans the whole card, picture and words alike: it is the card's first child,
          // and on a card laid out as a row it takes a line of its own, with the row of picture and
          // words wrapping under it at the height the picture was given.
          ...(mediaBand && beside ? [{ flexWrap: "wrap", alignContent: "flex-start" }] : []),
          // At one card size the words take what the picture leaves: beside a poster, the column
          // is the width the picture did not need; under a banner, the footer is a stated height
          // and the picture is sized to what that leaves, so the two cannot disagree.
          ...(rowSize && shape
            ? [
                beside
                  ? { "& > .MuiCardActionArea-root": { width: "auto" } }
                  : { "& > .MuiCardContent-root": rowFooterSx(rowSize.footerHeight) },
              ]
            : []),
          ...(Array.isArray(cardSx) ? cardSx : [cardSx]),
        ]}
      >
        {/* The card's own two halves and nothing else. Context crosses a portal, so a provider
            wrapping the dialog below would hand the expanded card the arrangement of the thumbnail
            it was opened from — a detail tree laid out beside a poster that is not there. The
            dialog draws its own full-width artwork and takes the default. */}
        <CardArrangementProvider value={beside ? "beside" : "stacked"}>
          {/* The whole card's width: a line of its own where the card is a row, the top of the
              block where it is not. Given no width of its own and stretched to the card's, for
              the reason the row footer is: a wrapping row sizes itself as if it were one line, so
              a band with a width would add that width to the picture's and the words'. */}
          {mediaBand && <Box sx={{ width: 0, minWidth: "100%" }}>{mediaBand.node}</Box>}
          <CardActionArea
            sx={mediaLayout === "aside" ? ASIDE_ACTION_AREA_SX : beside ? SHAPE_ASIDE_ACTION_AREA_SX : undefined}
          >
            {missing ? (
              /* The picture's own box, filled and named. It carries `mediaSx` exactly as the image
                 does, so it stands where the picture would have and holds the same reservation —
                 `auto <ratio>` resolves to the ratio on an element with no natural size of its
                 own, which is what keeps a wall of these the height the offsets are measured
                 against. Its own rules go first so a caller's width and height still win — all but
                 the display, which is last because it is the tile's alone: the artwork column sets
                 `block` to close the line box under an image, and a tile inherits that as a title
                 in the top corner of a box it was meant to be centred in. */
              <Box
                // A span, because the card's action area is a button and only phrasing content is
                // legal inside one — which the image it stands in for is and a div is not.
                component="span"
                onClick={detail.show}
                sx={[
                  {
                    width: "100%",
                    alignItems: "center",
                    justifyContent: "center",
                    padding: 1,
                    overflow: "hidden",
                    backgroundColor: palette.tile,
                  },
                  ...mediaSx,
                  { display: "flex" },
                ]}
              >
                <Typography
                  variant="caption"
                  sx={{ color: palette.muted, textAlign: "center" }}
                >
                  {alt}
                </Typography>
              </Box>
            ) : (
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
                  detail.show();
                }}
                loading={lazy ? "lazy" : undefined}
                ref={imgRef}
                onLoad={(el) => readImage(el.currentTarget, image, extractColour && !sampled, setRatio, setExtracted)}
                onError={() => setFailedImage(image)}
                sx={mediaSx}
              />
            )}
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
        </CardArrangementProvider>
        {/* The whole `Dialog` is what this card gates on `mounted`, not just the body inside it.
            MUI's `Modal` returns null for a closed dialog, but only after `Dialog` and `Modal`
            have rendered and their hooks and effect have run, and this card is the one an uncapped
            wall renders per item: a thousand of them is a thousand component instances
            re-evaluated on every render of the wall, all of them closed. */}
        {detail.mounted && (
          <Dialog
            open={detail.open}
            onClose={detail.hide}
            maxWidth={false}
            scroll="body"
            slots={{ transition: Grow }}
            slotProps={{
              paper: { sx: { backgroundColor: "unset", boxShadow: "unset", backgroundImage: "unset" } },
              transition: { onExited: detail.onExited },
            }}
          >
            <ArtworkAccent.Provider value={dialogColour}>
              <Card
                variant="elevation"
                sx={{
                  backgroundColor: dialogPalette.ground,
                  color: dialogPalette.onGround,
                }}
              >
                <Box
                  onClick={detail.hide}
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
                    onClick={detail.hide}
                  />
                </Box>
                <Box
                  sx={{
                    display: "flex",
                    // The same line every other surface draws where it meets the artwork it was
                    // sampled from. A gradient fading the image into the ground joins them instead,
                    // which reads as the artwork running out rather than as one card in two parts —
                    // and spends the bottom tenth of every image to do it.
                    borderTop: palette.seam,
                  }}
                >
                  <Box
                    sx={{
                      flexGrow: "1",
                      width: "0px",
                    }}
                  >
                    {detailComponent?.()}
                  </Box>
                </Box>
              </Card>
            </ArtworkAccent.Provider>
          </Dialog>
        )}
      </Card>
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
type PanelLayout = "beneath" | "beside" | "hero";

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
  statSize,
  inlineKicker,
  layout,
  minHeight,
  height,
  inset,
  middle,
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
  /** Only where the caller holds the panel to a height its content did not choose. */
  statSize?: TileSize;
  /**
   * Draws the subtitle on the kicker's line rather than under the title.
   *
   * A panel as wide as a card rather than as a column beside one has room to say when and what on
   * one line, and the line it saves is the whole of what a stated height has spare. Only a caller
   * that knows its panel's width can ask for it: in a 176px column the same two would wrap to four
   * lines and cost more than they saved.
   */
  inlineKicker?: boolean;
  /** Only where the caller's layout says something its card does not. */
  layout?: PanelLayout;
  /** Holds the panel to the artwork's height, so the card is the height of the picture in it. */
  minHeight?: number;
  /**
   * A stated height the panel's words have to fit, rather than one they set.
   *
   * The Omnibus's Now band is the caller: every card there is one width, so the banner card's
   * picture takes the height its width implies at 16:9 and the panel gets exactly what is left.
   * Given a budget the panel owns what follows from it — the words at the top and the figures at
   * the bottom, and a title that cannot wrap, because a second line would push the tile out of the
   * card rather than grow it. Stated here rather than reached in from the card's own `sx`, which
   * would mean out-weighting the padding rule this component sets about itself.
   */
  height?: number;
  /** The inset a panel keeps, where a caller's row is read across the figures panels end with. */
  inset?: number;
  /**
   * What the panel says between its words and its figures — the hero's franchise strip and the
   * two ledger rows it leads with. Between rather than after, so a panel holding the artwork's
   * height spends the middle of it on the item's own story instead of leaving that height as
   * ground between the subtitle and the tiles.
   */
  middle?: ReactNode;
}) => {
  const palette = useArtworkPalette();
  const arrangement = useCardArrangement();
  const resolved = layout ?? (arrangement === "beside" ? "beside" : "beneath");
  const beside = resolved === "beside";
  const hero = resolved === "hero";
  // The parts that actually say something. A caller lists its fields without testing which the
  // sheet filled in, and the count is what decides which part is last and so carries no separator.
  const said = Array.isArray(subtitle) ? subtitle.filter((part) => part.text) : [];
  // Whether the kicker row is the one stating the subtitle, which is the only thing that decides
  // whether it is also stated below the title. Every term matters: the row is rendered on `kicker`
  // alone, and it draws `said`, which a plain-string subtitle leaves empty.
  const saidInline = inlineKicker && !!kicker && said.length > 0;

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
        // A budgeted panel spends its height as structure — words at the top, figures at the
        // bottom — and clips rather than overflowing, which is what makes the title's one line a
        // guarantee instead of a hope.
        ...(height && {
          height,
          justifyContent: "space-between",
          gap: 0,
          overflow: "hidden",
          "& .MuiTypography-h6": {
            display: "-webkit-box",
            WebkitBoxOrient: "vertical",
            WebkitLineClamp: 1,
            overflow: "hidden",
          },
        }),
        ...(inset !== undefined && { paddingY: inset }),
        ":last-child": { paddingBottom: inset ?? 2 },
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
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "center",
              columnGap: 0.75,
              // The two ends of the line rather than a run of parts: the kicker says when and the
              // subtitle says what, and pushing them apart is what separates them — no mark needed
              // between two things the width already tells apart.
              ...(inlineKicker && { width: "100%", justifyContent: "space-between" }),
            }}
          >
            <Typography
              variant="caption"
              sx={{ color: palette.muted, ...LABEL_SX }}
            >
              {kicker}
            </Typography>
            {saidInline && <SubtitleParts parts={said} />}
          </Box>
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
            it sits under the title in the same tone the dates take.

            Gated on whether the kicker row actually took it rather than on `inlineKicker` alone:
            that row is only rendered where there is a kicker, and it can only carry parts, so a
            card asking for an inline subtitle without one or with a plain string would otherwise
            drop the subtitle entirely rather than fall back to stating it here. */}
        {subtitle &&
          !saidInline &&
          (Array.isArray(subtitle) ? (
            <SubtitleParts parts={said} />
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

      {middle}

      {stats.length > 0 && (
        <StatTileGrid
          stats={stats}
          size={statSize}
        />
      )}
    </CardContent>
  );
};

/**
 * The parts of a subtitle, wherever they are drawn — under the title, or on the kicker's own line.
 *
 * Each part is one box rather than three loose ones, because a line break falls between flex items:
 * with the swatch, the separator and the text each an item of the wrapping row, a narrow column
 * breaks a mark off the thing it marks. Grouped, the only place a break can fall is between parts,
 * and the separator closes its own part rather than opening the next — a line that ends "Apple TV ·"
 * says a part is still to come, where one that opens "· True Story" reads as joined to nothing.
 */
const SubtitleParts = ({ parts }: { parts: PanelSubtitlePart[] }) => {
  const palette = useArtworkPalette();

  return (
    <Box sx={{ display: "flex", flexWrap: "wrap", alignItems: "center", columnGap: 0.75, color: palette.muted }}>
      {parts.map((part, index) => (
        <Box
          // The position, not the text: a caller's parts are a fixed sequence rebuilt whole on
          // every render, and two of them can hold the same word — the gameplay and genre
          // vocabularies both contain "Action" and "Adventure", and a game can be both.
          key={index}
          // The floor is what lets a part longer than the whole column wrap inside itself rather than
          // push the row wider than the card.
          sx={{ display: "inline-flex", alignItems: "center", columnGap: 0.75, minWidth: 0 }}
        >
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
          {index < parts.length - 1 && <Typography variant="body2">·</Typography>}
        </Box>
      ))}
    </Box>
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
const StatTileGrid = ({ stats, size }: { stats: CardStat[]; size?: TileSize }) => {
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
/**
 * The three sizes a tile is drawn at, and what each is for.
 *
 * `hero` is the expanded card's, where a figure is the reason the card was opened. The default is
 * every strip and panel's. `compact` is for a panel working to a stated height rather than to its
 * own content — the Now band, whose three cards share one height and whose banner card has only
 * what its picture leaves.
 *
 * The compact tile is the one with a height of its own, because it is the part of that budget that
 * has to be known before the words are laid out: at 48 a kicker, a title, a subtitle and a tile
 * come to exactly the 136 the band's banner card has. The other two are the height their content
 * makes them, which is what a panel sized by its own content wants.
 */
const COMPACT_TILE_HEIGHT = 48;
const TILE_PADDING: Record<TileSize, number> = { hero: 1, default: 1, compact: 0.25 };
const TILE_FIGURE: Record<TileSize, string> = { hero: "1.5rem", default: "1.25rem", compact: "1.125rem" };

type TileSize = "hero" | "default" | "compact";

const StatTile = ({ value, label, colour, size }: CardStat & { size?: TileSize }) => {
  const palette = useArtworkPalette();
  const tile = size ?? "default";

  return (
    <Box
      sx={{
        flex: 1,
        padding: TILE_PADDING[tile],
        borderRadius: 1,
        textAlign: "center",
        // Stated only where the panel around it is: the figure and its label then centre in a tile
        // whose height the card counted on rather than one they happened to add up to.
        ...(tile === "compact" && {
          height: COMPACT_TILE_HEIGHT,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }),
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
          fontSize: TILE_FIGURE[tile],
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
const HeroStatRow = ({ stats }: { stats: CardStat[] }) => {
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
const MetadataLedger = ({ rows }: { rows: LedgerRow[] }) => {
  if (rows.length === 0) return null;

  return (
    <Grid size={12}>
      <LedgerList
        rows={rows}
        columns={{ xs: 1, md: 2 }}
      />
    </Grid>
  );
};

/**
 * The ledger's rows without the grid cell the expanded card seats them in, for a surface that lays
 * them out itself — the hero's panel, which gives its two rows a single column whatever its width.
 */
export const LedgerList = ({ rows, columns }: { rows: LedgerRow[]; columns: { xs: number; md: number } }) => {
  const palette = useArtworkPalette();

  return (
    <Box sx={{ columnCount: columns, columnGap: 3 }}>
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
  );
};

/**
 * The strip under a thumbnail. Painted from the same recipe as the hover card's panel, so the two
 * are one system and the type does not have to invert on a pale sample to stay readable.
 *
 * Rows read bottom-up: the last one carries the figures and anything above it is the context they
 * belong to, which is why only the last is given the full tone. A label builder adding a row is
 * adding context, and belongs above the figures for the same reason. The two ranks are set as well
 * as toned — a label over a line, which is the kicker-and-title the hero and the Now band already
 * state a date and its subject in. At one size they differ only in tone, and two rows of the same
 * type read as one line dimmed rather than as a hierarchy.
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
              // A context row is set as a label and the closing row as the card's own line: the
              // hero and the Now band already state a date as a kicker over the thing it dates,
              // and a stat card is the same card smaller. Left at one size the two rows differ
              // only in tone, which reads as one line dimmed rather than as two ranks.
              variant={index < labels.length - 1 ? "caption" : "subtitle2"}
              sx={[
                index < labels.length - 1 ? LABEL_SX : { fontWeight: 600 },
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
                  : {},
              ]}
            >
              {val}
            </Typography>
          ))}
        </Stack>
      ))}
    </CardContent>
  );
};

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
          ...dimSx(hovered, item.name),
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
  "&:hover": { opacity: 1, filter: "brightness(1.25)" },
} as const;

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

/**
 * The body of an expanded card: the item's strip, its figures, and its ledger, in that order.
 *
 * The three tiers are the card's own arrangement rather than each domain's — a tab that laid them
 * out again could lay them out differently, and the order is the whole point of the two-tier
 * treatment: a strip placing the item in time, then the figures a reader opened the card for, then
 * everything else as label-and-value lines that a grid would hold to the tallest row on it.
 *
 * A component rather than JSX inside a caller's thunk, so the scheme each domain reads is read
 * where the body is built. Reading it in the card itself would put a context subscription on every
 * card of an uncapped wall to serve the one that is open, which is the cost the thunk avoids.
 */
export const CardDetailBody = ({
  strip,
  stats,
  rows,
}: {
  /** The item's franchise strip, which only its domain can build; nothing for a standalone. */
  strip: ReactNode;
  stats: CardStat[];
  rows: LedgerRow[];
}) => (
  <CardContent>
    <Grid
      container
      spacing={1}
    >
      {strip && <Grid size={12}>{strip}</Grid>}
      <HeroStatRow stats={stats} />
      <MetadataLedger rows={rows} />
    </Grid>
  </CardContent>
);
