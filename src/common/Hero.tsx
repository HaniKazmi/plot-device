import { Box, CardContent, Stack, Typography } from "@mui/material";
import { StatTile, type TypedCardMediaImage } from "./Card";
import { useArtworkPalette } from "./artworkPalette";

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

/** A headline figure and what it counts. */
export interface HeroStat {
  label: string;
  value: number | string;
}

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
  /** The line above the title, saying why this item is the one shown. */
  kicker: string;
  title: string;
  subtitle?: string;
  stats: HeroStat[];
}) => (
  <props.MediaComponent
    item={props.item}
    extractColour
    landscape
    cardSx={{
      flexDirection: { xs: "column", md: "row" },
      alignItems: "flex-start",
      overflow: "hidden",
      // `CardActionArea` is `width: 100%`, which as a flex item resolves its basis to the whole
      // card: the panel beside it is then dividing up no free space at all, and collapses to the
      // width of its longest word while the artwork sits in a column of empty ground. The action
      // area has to be told to be exactly as wide as the artwork it wraps and no wider.
      "& > .MuiCardActionArea-root": {
        // Basis `auto` against a shrink-to-fit width, so the column is however wide the artwork
        // turned out to be at this height and the panel takes the rest.
        flex: "0 0 auto",
        width: { xs: "100%", md: "auto" },
        // The image is a fixed height, so the artwork column ends where the artwork does rather
        // than stretching to a taller panel.
        alignSelf: "flex-start",
      },
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
      <HeroPanel
        kicker={props.kicker}
        title={props.title}
        subtitle={props.subtitle}
        stats={props.stats}
      />
    }
  />
);

/**
 * Everything the hero says in words, on the ground its artwork sampled to.
 *
 * `minWidth: 0` because a flex item's floor is its content's intrinsic width, and a long title
 * would otherwise push the panel wider than the card and refuse to wrap.
 */
const HeroPanel = (props: { kicker: string; title: string; subtitle?: string; stats: HeroStat[] }) => {
  const palette = useArtworkPalette();

  return (
    <CardContent
      sx={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        gap: 2,
        // Basis zero and free to grow, so the panel is exactly the row minus the artwork column.
        flex: "1 1 0",
        // A flex item's floor is its content's intrinsic width. Without this a long title sets
        // that floor to the width of its longest word and the panel refuses to wrap or shrink.
        minWidth: 0,
        // As tall as the artwork beside it, which is what gives `space-between` something to
        // distribute: the title rides at the top and the figures sit on the bottom edge.
        minHeight: { md: MEDIA_HEIGHT },
        ":last-child": { paddingBottom: 3 },
        backgroundColor: palette.ground,
        color: palette.onGround,
        // The seam every surface draws where it meets the artwork it was sampled from, rotated
        // with the layout so it is drawn on the edge the two actually share.
        borderTop: { xs: palette.seam, md: "none" },
        borderLeft: { xs: "none", md: palette.seam },
      }}
    >
      <Stack
        spacing={0.5}
        sx={{ alignItems: "flex-start" }}
      >
        <Typography
          variant="caption"
          sx={{ color: palette.muted, letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          {props.kicker}
        </Typography>
        <Typography
          variant="h4"
          // A title long enough to have no break opportunity would otherwise set the panel's
          // intrinsic width and push itself out past the card's edge.
          sx={{ fontWeight: 700, lineHeight: 1.15, overflowWrap: "break-word", width: "100%" }}
        >
          {props.title}
        </Typography>
        {props.subtitle && (
          <Typography
            variant="body1"
            sx={{ color: palette.muted }}
          >
            {props.subtitle}
          </Typography>
        )}
      </Stack>

      {props.stats.length > 0 && (
        <Box
          sx={{
            display: "grid",
            // Two figures per row on a phone, one row of all of them once there is width for it.
            gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: `repeat(${props.stats.length}, 1fr)` },
            gap: 1,
            width: "100%",
          }}
        >
          {props.stats.map((stat) => (
            <StatTile
              key={stat.label}
              value={stat.value}
              label={stat.label}
            />
          ))}
        </Box>
      )}
    </CardContent>
  );
};
