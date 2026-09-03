import { Box, Stack } from "@mui/material";
import type { ReactNode } from "react";
import {
  CardPanel,
  LedgerList,
  type CardMediaImageProps,
  type LedgerRow,
  type PanelStat,
  type PanelSubtitlePart,
  type TypedCardMediaImage,
} from "./Card";

/**
 * How tall the artwork is beside the panel, and on a phone above it.
 *
 * Height is the only dimension fixed, so the hero is the same height whatever it is showing while
 * the artwork keeps its own shape — a 16:9 banner comes out around 533px wide and a 2:3 poster
 * around 200px, and neither is cut into.
 */
const MEDIA_HEIGHT = 300;

/**
 * A panorama at 300px tall runs wide enough to leave the panel nothing, and the panel can shrink
 * to nothing because it has to be able to. This is the ceiling that stops it, and `contain` is
 * what keeps the ceiling from turning into a crop: past this width the artwork is letterboxed
 * onto the card's own ground rather than cut down or stretched.
 */
const MEDIA_MAX_WIDTH = 560;

type HeroStat = PanelStat;

/**
 * The one item a page is currently about, given the top of that page and the whole of its own
 * artwork colour.
 *
 * It is the domain's `TypedCardMediaImage` that is rendered, not a bare image, so the hero costs
 * nothing to keep in step with the cards below it: the artwork opens the same expanded card a
 * thumbnail does, and the panel rides in as that card's footer, which is what puts it inside the
 * `ArtworkAccent` the image publishes. Reading the accent any other way would mean the hero
 * sampling the same image a second time and painting from whichever answer arrived first.
 *
 * The panel is held to the artwork's height, and a title, a subtitle and a row of tiles fill a
 * third of it. The middle is the item's own story: its franchise strip, in the order the series
 * was met, and the two ledger rows its domain leads with. On a phone the panel is only as tall as
 * its own lines, so the strip is dropped there and the rows stay.
 */
export const Hero = <T,>(props: {
  item: T;
  MediaComponent: TypedCardMediaImage<T>;
  /** The line above the title, saying why this item is the one shown. */
  kicker: string;
  title: string;
  subtitle?: string | PanelSubtitlePart[];
  stats: HeroStat[];
  /** The same corner badge the item's thumbnail carries, so the promoted one is not the bare one. */
  chip?: CardMediaImageProps["chip"];
  /** The item's franchise strip, where it has a franchise to be placed in. */
  strip?: ReactNode;
  /** The two or three facts the domain puts beside the strip. */
  rows?: LedgerRow[];
}) => (
  <props.MediaComponent
    item={props.item}
    extractColour
    landscape
    // The panel sits beside the artwork and needs the width the artwork did not take.
    mediaLayout="aside"
    chip={props.chip}
    cardSx={{
      flexDirection: { xs: "column", md: "row" },
      alignItems: "flex-start",
      overflow: "hidden",
    }}
    sx={{
      // Height alone is pinned and the width follows the artwork's own ratio, so nothing is cut
      // into. Left to itself the artwork sets the height instead, and a 2:3 poster at natural
      // size makes the hero taller than the screen and pushes the rest of the page below the fold.
      width: { xs: "100%", md: "auto" },
      height: { xs: "auto", md: MEDIA_HEIGHT },
      maxWidth: { md: MEDIA_MAX_WIDTH },
      objectFit: "contain",
      display: "block",
    }}
    footerComponent={
      <CardPanel
        layout="hero"
        kicker={props.kicker}
        title={props.title}
        titleVariant="h4"
        subtitle={props.subtitle}
        stats={props.stats}
        minHeight={MEDIA_HEIGHT}
        middle={
          (props.strip || (props.rows && props.rows.length > 0)) && (
            <Stack spacing={1}>
              {props.strip && <Box sx={{ display: { xs: "none", md: "block" } }}>{props.strip}</Box>}
              {props.rows && props.rows.length > 0 && (
                <LedgerList
                  rows={props.rows}
                  columns={{ xs: 1, md: 1 }}
                />
              )}
            </Stack>
          )
        }
      />
    }
  />
);
