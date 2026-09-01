import { Box, Card, CardContent, Stack, useTheme, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { Hub } from "@mui/icons-material";
import { useLayoutEffect, type RefObject } from "react";
import { Swatch, TimelineAxis, TimelineCard, INLINE_SWATCH_SIZE, type TimelineBand } from "../common/Card";
import { LazyTooltip } from "../common/LazyTooltip";
import { SectionHeader } from "../common/SectionHeader";
import type { TimelineTick } from "../common/timelineLayout";
import { FADE_Z, ScrollFade } from "../common/ScrollFade";
import { useScrollEdges } from "../common/useScrollEdges";
import { format } from "../utils/mathUtils";
import { OmniHoverCard } from "./CardMediaImage";
import type { Crossing } from "./crossingsData";
import { mediumToColour, mediumToLabel } from "./types";

/**
 * How many franchises the section draws. The strips are ordered by size, so the cut falls where a
 * crossing stops being a series met twice and becomes a title that happens to appear twice; the
 * header states the full count so the cut is visible rather than silent.
 */
const STRIPS_SHOWN = 12;

/**
 * The horizontal inset a strip sits at inside its own card, which the shared axis has to match to
 * line up with the strips above it. One number, because the two are the same edge.
 */
const STRIP_INSET = 1;

/**
 * How much wider than its container the stack is drawn, and scrolled across.
 *
 * A quarter of a century in one screen width gives a year about fifty pixels, and a franchise like
 * Marvel puts fifty-one entries on it — a dozen of them inside two years, at a minimum mark width
 * of six pixels. The marks are then closer together than they are wide, and the strip reads as a
 * texture rather than as dates. At three times the width a year is a hundred and fifty pixels and
 * the same run separates into the entries it is made of.
 *
 * Three rather than the full timeline's four: that chart is one row of bars and can spend the
 * height on labels inside them, where this is a stack of twelve and every viewport of scroll is
 * paid for twelve times over.
 */
const SCALE_WIDTH = "300%";

/**
 * The franchises the reader met in more than one medium, each on one shared scale.
 *
 * This is the section none of the three tabs can hold: a franchise strip on the Games tab knows
 * only about games. Here a lane per medium against one epoch–today scale says which came first and
 * how long the reader stayed with it, and the fill is the only thing carrying which is which.
 *
 * One scale means one axis. Every strip is handed the same tick array — the section is given a
 * single one, built once by `Graphs` — so a per-strip axis is not twelve axes but the same row of
 * year labels drawn twelve times, a quarter of the section's height spent restating a scale that
 * cannot vary. Stated once beneath the stack, the labels say the same thing and the strips read as
 * one chart rather than as twelve charts that happen to agree.
 */
const Crossings = ({ crossings, ticks }: { crossings: Crossing[]; ticks: TimelineTick[] }) => {
  const [scrollRef, edges, onScroll] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
  useOpenAtLatest(scrollRef, crossings.length);

  return (
    <Card>
      <SectionHeader
        icon={<Hub />}
        title="Franchises across media"
        count={
          crossings.length > STRIPS_SHOWN
            ? `${format(STRIPS_SHOWN)} of ${format(crossings.length)} franchises`
            : `${format(crossings.length)} franchises`
        }
      />
      <CardContent>
        <ScrollFade
          edges={edges}
          ground={theme.vars.palette.background.paper}
        >
          <Box
            ref={scrollRef}
            onScroll={onScroll}
            sx={{
              overflowX: "auto",
              // The bar the platform may or may not draw. Where it does, this is the room for it;
              // where it does not, the fades are what say the stack runs on.
              paddingBottom: 1,
              scrollbarWidth: "thin",
              scrollbarColor: `${theme.vars.palette.text.secondary} ${theme.vars.palette.divider}`,
            }}
          >
            <Box sx={{ width: SCALE_WIDTH }}>
              <Grid
                container
                spacing={1}
                // The whole stack is one scroller, so the strips cannot come out of step with each
                // other or with the axis: a scroller per strip would let a reader compare two rows
                // showing different decades, which is the one thing a shared scale exists to stop.
                sx={{
                  // A sticky element travels with the nearest scrolling ancestor, and `Card` clips
                  // its own content — so a caption left to it sticks to a card that does not scroll
                  // and simply leaves with the track. Opening the card lets the caption reach the
                  // one scroller; the strip inside keeps its own clipping, which is what the rounded
                  // track needs.
                  "& .MuiPaper-root": { overflow: "visible" },
                  // The name then stays where it can be read while its own track travels under it.
                  // It is the card's own caption rather than a column beside the stack, so a name
                  // and its strip cannot drift apart vertically.
                  "& .MuiCardContent-root > .MuiTypography-caption": {
                    position: "sticky",
                    left: 0,
                    width: "fit-content",
                    maxWidth: "100%",
                    // Above the leading fade, which sits exactly where the pinned names do. The fade
                    // is for the track running out of the card, and a name is not part of the track.
                    zIndex: FADE_Z + 1,
                  },
                }}
              >
                {crossings.slice(0, STRIPS_SHOWN).map((crossing) => (
                  <TimelineCard
                    key={crossing.franchise}
                    bands={crossing.bands.map(toBand)}
                    laneCount={crossing.laneCount}
                    ticks={ticks}
                    axis={false}
                    caption={<CrossingCaption crossing={crossing} />}
                  />
                ))}
              </Grid>
              {/* At the strips' own inset, so a year label stands under the gridline it names. */}
              <Box sx={{ paddingX: STRIP_INSET }}>
                <TimelineAxis ticks={ticks} />
              </Box>
            </Box>
          </Box>
        </ScrollFade>
      </CardContent>
    </Card>
  );
};

/**
 * Opened at the most recent end, which is where the crossings are.
 *
 * The section's epoch is its earliest entry anywhere, and most franchises here were met years
 * after it — opened at the left, the first screenful is a third of the scale with almost nothing
 * on it. The full timeline opens the same way for the same reason, and the fades say what is
 * behind. Keyed on how many strips there are, so a filter that empties and refills the section
 * re-opens it, and a hover does not.
 */
const useOpenAtLatest = (ref: RefObject<HTMLDivElement | null>, strips: number) => {
  useLayoutEffect(() => {
    const element = ref.current;
    if (element) element.scrollLeft = element.scrollWidth;
  }, [ref, strips]);
};

/**
 * The strip's own legend, which is what makes an unlabelled lane readable: the media are named in
 * the fills their lanes are drawn in, in the order the lanes run down the strip.
 */
const CrossingCaption = ({ crossing }: { crossing: Crossing }) => (
  <Stack
    direction="row"
    spacing={1}
    sx={{ alignItems: "center", flexWrap: "wrap" }}
  >
    <Typography
      variant="caption"
      noWrap
      sx={{ fontWeight: 700 }}
    >
      {crossing.franchise}
    </Typography>
    {crossing.media.map((medium) => (
      <Stack
        key={medium}
        direction="row"
        spacing={0.5}
        sx={{ alignItems: "center" }}
      >
        <Swatch
          colour={mediumToColour(medium)}
          size={INLINE_SWATCH_SIZE}
        />
        <Typography variant="caption">{mediumToLabel(medium)}</Typography>
      </Stack>
    ))}
    <Typography variant="caption">{`${format(crossing.entries)} entries`}</Typography>
  </Stack>
);

const toBand = (band: Crossing["bands"][number]): TimelineBand => ({
  key: band.key,
  startPercent: band.startPercent,
  widthPercent: band.widthPercent,
  lane: band.lane,
  colour: mediumToColour(band.item.medium),
  imprecise: !band.precise,
  hoverCard: true,
  tooltip: <LazyTooltip render={() => <OmniHoverCard item={band.item} />} />,
});

export default Crossings;
