import { Box } from "@mui/material";
import type { ReactNode } from "react";
import { HeroPanel, type PanelStat, type PanelSubtitlePart, type TypedCardMediaImage } from "./Card";
import { shapeRatioValues, shapeToArrangement, shapeToAspect, type ArtworkShape } from "./cardArrangement";
import { HERO_BESIDE, HERO_CONTAINER } from "./heroLayout";
import { heroKicker, type HeroActivity } from "./heroKicker";

/** The words column beside a phone's poster, which the poster's height gives way to keep. */
const PHONE_PANEL_FLOOR = 154;

/**
 * The phone's height: 300px, or less where the hero is too narrow to stand a 300px poster beside a
 * column of `PHONE_PANEL_FLOOR`. Read against the hero's own width (`cqi`, the hero being a size
 * container), and solved at the poster's ratio, the widest portrait shape, so a cover beside the
 * same words leaves them a little more.
 */
function phoneHeight() {
  return `min(300px, calc((100cqi - ${PHONE_PANEL_FLOOR}px) / ${shapeRatioValues.poster}))`;
}

/**
 * How tall the artwork stands, at each width the page gives the hero, whatever its shape.
 *
 * Height is the only dimension fixed, so every hero on a width is one height while the artwork
 * keeps its own shape — a 16:9 banner comes out around 533px wide at 300 and a 680×1000 poster
 * around 204 — and neither is cut into. One figure per width rather than one per shape, so the
 * four tabs' heroes are the same size on any screen they share; the panel draws itself to fit it
 * (`common/heroLayout.ts`).
 *
 * The phone's 300 is a poster 204px wide beside a 154px panel on a 390px phone, and on a narrower
 * one the poster gives way so the words keep that 154: at 360px a 300px poster leaves them 124 and
 * at 320 84, where a title runs to six letters a line. A banner on a phone stands over its words
 * instead and is as tall as the width gives it. The tablet's 280 is a poster 190px wide, and a
 * banner 498px wide beside a 222px panel on a 768px page.
 *
 * A custom property rather than a responsive height on the picture, because a banner takes it only
 * once the hero has room to stand it beside its words: that is a container query, and a responsive
 * value inside one is a media query nested in a container query, which is not a rule to hand to the
 * style engine when a variable says the same thing.
 */
const HERO_HEIGHT = { xs: phoneHeight(), sm: "280px", md: "300px" };

/**
 * A panorama at 300px tall runs wide enough to leave the panel nothing, and the panel can shrink
 * to nothing because it has to be able to. This is the ceiling that stops it, and `contain` is
 * what keeps the ceiling from turning into a crop: past this width the artwork is letterboxed
 * onto the card's own ground rather than cut down or stretched.
 */
const MEDIA_MAX_WIDTH = 560;

/** The hero's box, which the arrangement asks how wide it is. */
const HERO_BOX_SX = {
  containerType: "inline-size",
  containerName: HERO_CONTAINER,
  "--hero-height": HERO_HEIGHT,
} as const;

/**
 * Beside its words, the card is the picture's height and no taller: the panel is drawn to fit it
 * (`common/heroLayout.ts`), and where a title and a subtitle both run to their clamps the words
 * give up their last line rather than standing the card taller and opening ground under the
 * picture. The artwork column is the picture's own width. A poster or a cover stands so at every
 * width, a portrait picture given the page's width being the whole of the first screen.
 */
const BESIDE_CARD_SX = {
  flexDirection: "row",
  height: "var(--hero-height)",
  "& > .MuiCardActionArea-root": { width: "auto" },
} as const;

/**
 * A banner, over its words until the hero is wide enough to stand it beside them. Over them, the
 * artwork column is the card's whole width and the card is as tall as the two together.
 */
const BANNER_CARD_SX = {
  flexDirection: "column",
  height: "auto",
  "& > .MuiCardActionArea-root": { width: "100%" },
  [HERO_BESIDE]: BESIDE_CARD_SX,
} as const;

/** Height alone pinned and the width following the artwork's own ratio, so nothing is cut into. */
const BESIDE_MEDIA_SX = { width: "auto", height: "var(--hero-height)", maxWidth: MEDIA_MAX_WIDTH } as const;

const BANNER_MEDIA_SX = { width: "100%", height: "auto", [HERO_BESIDE]: BESIDE_MEDIA_SX } as const;

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
 * Shape decides one thing: where the picture stands. A banner stands over its words until the hero
 * has room to seat them beside it; a poster or a cover seats them beside at every width, because a
 * portrait picture given the page's width is the whole of the first screen. How the words are
 * drawn — the title's size, the figures as lines or tiles, the franchise strip — is the screen's and
 * the panel's own width's to decide (`HeroPanel`), so a domain names its artwork once and the hero
 * never learns which domain it is drawing.
 *
 * The panel's lower edge is the item's place: its franchise strip, in its hero variant, beside or
 * over its figures. It is handed in whole rather than wrapped here: a domain's strip renders
 * nothing for a standalone item, and a wrapper around nothing would still stand in the panel and
 * take its gap.
 */
export const Hero = <T,>(props: {
  item: T;
  MediaComponent: TypedCardMediaImage<T>;
  /** The shape this domain's artwork comes in, which is what decides where the words sit. */
  shape: ArtworkShape;
  /** What the reader is doing with the item and since when, or did and when: the line over the title. */
  activity: HeroActivity;
  title: string;
  /** Where it was met first, then what it is: the venue, then the medium's own words, then the genre. */
  subtitle: PanelSubtitlePart[];
  /** The item's own figures, in the order every hero states them: how long, how much, how good. */
  stats: PanelStat[];
  /** The item's franchise strip in its hero variant, where it has a franchise to be placed in. */
  strip?: ReactNode;
}) => {
  const aside = shapeToArrangement(props.shape) === "beside";

  return (
    <Box sx={HERO_BOX_SX}>
      <props.MediaComponent
        item={props.item}
        extractColour
        landscape
        // The panel sits beside the artwork and needs the width the artwork did not take. Named
        // rather than left to `shape`, which would also hand the card's own arrangement to every
        // panel and tile grid inside it — this caller has pinned the artwork's size itself.
        mediaLayout="aside"
        cardSx={aside ? BESIDE_CARD_SX : BANNER_CARD_SX}
        sx={[
          aside ? BESIDE_MEDIA_SX : BANNER_MEDIA_SX,
          // The shape stands in until the file lands, so the panel beside it is not handed the
          // whole card for the frame it takes to arrive. The `auto` form keeps that a reservation
          // and never a crop, and `contain` keeps the panorama's ceiling from becoming one: a
          // file's own ratio wins the moment it is known.
          { aspectRatio: shapeToAspect(props.shape), objectFit: "contain" },
        ]}
        footerComponent={
          <HeroPanel
            aside={aside}
            kicker={heroKicker(props.activity)}
            title={props.title}
            subtitle={props.subtitle}
            stats={props.stats}
            strip={props.strip}
          />
        }
      />
    </Box>
  );
};
