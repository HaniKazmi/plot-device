import type { ReactNode } from "react";
import { CardPanel, HeroStatBand, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "./Card";
import { shapeToArrangement, shapeToAspect, type ArtworkShape } from "./cardArrangement";

/**
 * How tall the artwork stands beside the panel, at each width the page gives the hero.
 *
 * Height is the only dimension fixed, so the hero is the same height whatever it is showing while
 * the artwork keeps its own shape — a 16:9 banner comes out around 533px wide and a 2:3 poster
 * around 200px, and neither is cut into.
 *
 * The two smaller figures are the phone's and the tablet's. A poster given the page's whole width
 * stands about 525px and a cover about 585px, so the panel under it starts below the fold and the
 * page opens on one picture; the arrangement rule (§6) is what answers that, and it answers it by
 * shape *and* width here, since the constraint a phone adds is the one shape alone cannot see.
 *
 * Below `md` the words beside the poster are held to its height and the tiles go under both
 * (`HeroStatBand`), so the poster fills its column with no ground beneath it: a kicker, a title of
 * three lines at most and a subtitle stand under 200; at 280 the tablet's panel also holds the
 * franchise strip.
 */
const MEDIA_HEIGHT = { xs: 200, sm: 280, md: 300 };

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
 * A banner stacks its words underneath until there is width to seat them beside it; a poster or a
 * cover seats them beside at every width, because a portrait picture given the page's width is the
 * whole of the first screen. That is the shape rule, and the shape is all the hero is told: a
 * domain names its own artwork once and the hero never learns which domain it is drawing.
 *
 * The panel's middle is the item's franchise strip, in its hero variant: the panel is held to the
 * artwork's height and cannot grow for a second row of beads, so the strip keeps its chain to one
 * row and closes the beads up on a series too long for the pitch, and the strip itself decides the
 * widths it stands at. It is handed in whole rather than wrapped here: a domain's strip renders
 * nothing for a standalone item, and a wrapper around nothing would still stand in the panel's
 * column and take its gap.
 */
export const Hero = <T,>(props: {
  item: T;
  MediaComponent: TypedCardMediaImage<T>;
  /** The shape this domain's artwork comes in, which is what decides where the words sit. */
  shape: ArtworkShape;
  /** The line above the title, saying why this item is the one shown. */
  kicker: string;
  title: string;
  subtitle?: string | PanelSubtitlePart[];
  stats: HeroStat[];
  /** The item's franchise strip in its hero variant, where it has a franchise to be placed in. */
  strip?: ReactNode;
}) => {
  const aside = shapeToArrangement(props.shape) === "beside";

  return (
    <props.MediaComponent
      item={props.item}
      extractColour
      landscape
      // The panel sits beside the artwork and needs the width the artwork did not take. Named
      // rather than left to `shape`, which would also hand the card's own arrangement to every
      // panel and tile grid inside it — this caller has pinned the artwork's size itself.
      mediaLayout="aside"
      cardSx={{
        flexDirection: aside ? "row" : { xs: "column", md: "row" },
        // Below `md` the tiles wrap onto a band of their own under the picture and the words.
        flexWrap: aside ? { xs: "wrap", md: "nowrap" } : "nowrap",
        // The panel takes the row's height where the artwork sets it, so its figures can sit on
        // the picture's own lower edge; a card whose words are underneath has no such row.
        alignItems: aside ? { xs: "stretch", md: "flex-start" } : "flex-start",
        overflow: "hidden",
        // The artwork column is the picture's own width at every width, not the card's. The
        // shared aside column hands it the whole card below `md`, which is the arrangement a
        // banner wants and the one a poster is here to avoid.
        ...(aside && { "& > .MuiCardActionArea-root": { width: "auto" } }),
      }}
      sx={{
        // Height alone is pinned and the width follows the artwork's own ratio, so nothing is cut
        // into. Left to itself the artwork sets the height instead, and a 2:3 poster at natural
        // size makes the hero taller than the screen and pushes the rest of the page below the fold.
        width: aside ? "auto" : { xs: "100%", md: "auto" },
        height: aside ? MEDIA_HEIGHT : { xs: "auto", md: MEDIA_HEIGHT.md },
        maxWidth: { md: MEDIA_MAX_WIDTH },
        // The shape stands in until the file lands, so the panel beside it is not handed the whole
        // card for the frame it takes to arrive. The `auto` form keeps that a reservation and never
        // a crop: a file's own ratio wins the moment it is known.
        aspectRatio: shapeToAspect(props.shape),
        objectFit: "contain",
        display: "block",
      }}
      footerComponent={
        <>
          <CardPanel
            layout={aside ? "hero-aside" : "hero"}
            kicker={props.kicker}
            title={props.title}
            titleVariant="h4"
            subtitle={props.subtitle}
            stats={props.stats}
            minHeight={MEDIA_HEIGHT.md}
            middle={props.strip}
          />
          {aside && <HeroStatBand stats={props.stats} />}
        </>
      }
    />
  );
};
