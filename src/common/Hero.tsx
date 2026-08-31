import {
  CardPanel,
  type CardMediaImageProps,
  type PanelStat,
  type PanelSubtitlePart,
  type TypedCardMediaImage,
} from "./Card";
import type { ArtworkShape } from "./cardArrangement";

/**
 * How tall the artwork is, whichever side of the panel it is on.
 *
 * Height is the only dimension fixed, so the hero is the same height whatever it is showing while
 * the artwork keeps its own shape — a 16:9 banner comes out around 533px wide and a 2:3 poster
 * around 200px, and neither is cut into. Letting a stacked banner set its own height instead makes
 * it as tall as two thirds of the card is wide, which puts everything the page is about below the
 * fold.
 */
const MEDIA_HEIGHT = 300;

/**
 * A panorama at 300px tall runs wide enough to leave the panel nothing, and the panel can shrink
 * to nothing because it has to be able to. This is the ceiling that stops it, and `contain` is
 * what keeps the ceiling from turning into a crop: past this width the artwork is letterboxed
 * onto the card's own ground rather than cut down or stretched.
 */
const MEDIA_MAX_WIDTH = 560;

export type HeroStat = PanelStat;

/**
 * The one item a page is currently about, given the top of that page and the whole of its own
 * artwork colour.
 *
 * It is the domain's `TypedCardMediaImage` that is rendered, not a bare image, so the hero costs
 * nothing to keep in step with the cards below it: the artwork opens the same expanded card a
 * thumbnail does, and the panel rides in as that card's footer, which is what puts it inside the
 * `ArtworkAccent` the image publishes. Reading the accent any other way would mean the hero
 * sampling the same image a second time and painting from whichever answer arrived first.
 */
export const Hero = <T,>(props: {
  item: T;
  MediaComponent: TypedCardMediaImage<T>;
  /**
   * The domain's own artwork shape, which arranges the hero the way it arranges every card below
   * it: a poster takes the panel beside it, a banner takes it underneath.
   */
  shape: ArtworkShape;
  /** The line above the title, saying why this item is the one shown. */
  kicker: string;
  title: string;
  subtitle?: string | PanelSubtitlePart[];
  stats: HeroStat[];
  /** The same corner badge the item's thumbnail carries, so the promoted one is not the bare one. */
  chip?: CardMediaImageProps["chip"];
}) => {
  const beside = props.shape === "portrait";

  return (
    <props.MediaComponent
      item={props.item}
      extractColour
      chip={props.chip}
      cardSx={
        beside
          ? // Beside once there is width for it, stacked on a phone — where a 200px poster beside a
            // panel leaves the panel a column too narrow to set a title in.
            { flexDirection: { xs: "column", md: "row" }, alignItems: "flex-start", overflow: "hidden" }
          : { overflow: "hidden" }
      }
      sx={
        beside
          ? {
              // Height alone is pinned and the width follows the artwork's own ratio, so nothing is
              // cut into. Left to itself the artwork sets the height instead, and a 2:3 poster at
              // natural size makes the hero taller than the screen.
              width: { xs: "100%", md: "auto" },
              height: { xs: "auto", md: MEDIA_HEIGHT },
              maxWidth: { md: MEDIA_MAX_WIDTH },
              objectFit: "contain",
              display: "block",
            }
          : {
              // A banner spanning the card sets its own height at nine sixteenths of it, which is
              // most of a screen. Pinning the height and containing within the full width keeps the
              // whole picture: what is left over falls as the card's own sampled ground either
              // side, which is the same ground the panel under it is painted on.
              width: "100%",
              height: MEDIA_HEIGHT,
              objectFit: "contain",
              display: "block",
            }
      }
      footerComponent={
        <CardPanel
          // Named rather than left to the card's shape: this is the one panel whose arrangement
          // turns over at a breakpoint, and beside on a phone is not what the shape alone says.
          layout={beside ? "hero" : "beneath"}
          kicker={props.kicker}
          title={props.title}
          titleVariant="h4"
          subtitle={props.subtitle}
          stats={props.stats}
          minHeight={beside ? MEDIA_HEIGHT : undefined}
        />
      }
    />
  );
};
