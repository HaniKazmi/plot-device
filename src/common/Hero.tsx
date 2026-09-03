import { Box } from "@mui/material";
import type { ReactNode } from "react";
import {
  CardPanel,
  LedgerList,
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
 * The franchise strip is a band across the whole card beneath the artwork and the panel, not a
 * part of the panel: the panel is held to the artwork's height, and anything that made it taller
 * would stand the artwork over a band of empty ground. Under both, the strip also has the card's
 * whole width, which a fifty-entry chain wants. The two ledger rows do sit in the panel, where the
 * words above and the tiles below leave them room once there is a column wide enough for the title
 * to take one line; narrower than that they are dropped, since a wrapped title and two rows would
 * outgrow the picture beside them.
 */
export const Hero = <T,>(props: {
  item: T;
  MediaComponent: TypedCardMediaImage<T>;
  /** The line above the title, saying why this item is the one shown. */
  kicker: string;
  title: string;
  subtitle?: string | PanelSubtitlePart[];
  stats: HeroStat[];
  /** The item's franchise strip, where it has a franchise to be placed in. */
  strip?: ReactNode;
  /** The two or three facts the domain leads with. */
  rows?: LedgerRow[];
}) => (
  <props.MediaComponent
    item={props.item}
    extractColour
    landscape
    // The panel sits beside the artwork and needs the width the artwork did not take.
    mediaLayout="aside"
    cardSx={{
      flexDirection: { xs: "column", md: "row" },
      // The strip is a third child of the row, given the card's whole width, so it wraps under
      // the artwork and the panel rather than beside them.
      flexWrap: "wrap",
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
      <>
        <CardPanel
          layout="hero"
          kicker={props.kicker}
          title={props.title}
          titleVariant="h4"
          subtitle={props.subtitle}
          stats={props.stats}
          minHeight={MEDIA_HEIGHT}
          middle={
            props.rows &&
            props.rows.length > 0 && (
              <Box sx={{ display: { xs: "block", md: "none", lg: "block" } }}>
                <LedgerList
                  rows={props.rows}
                  columns={{ xs: 1, md: 1 }}
                />
              </Box>
            )
          }
        />
        {props.strip && (
          // Stretched to the card's width the way a band across a wrapping row is: with no width
          // of its own to add to the artwork's and the panel's, and a minimum that spans the row.
          <Box sx={{ width: 0, minWidth: "100%", paddingX: 2, paddingBottom: 2 }}>{props.strip}</Box>
        )}
      </>
    }
  />
);
