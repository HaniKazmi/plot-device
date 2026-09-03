import { Box, Card, CardContent, Stack, useTheme, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { Hub } from "@mui/icons-material";
import { Swatch, TimelineAxis, TimelineCard, INLINE_SWATCH_SIZE, type TimelineBand } from "../common/Card";
import { FranchiseName } from "../common/FranchiseStrip";
import { LazyTooltip } from "../common/LazyTooltip";
import { SectionHeader } from "../common/SectionHeader";
import type { TimelineTick } from "../common/timelineLayout";
import { ScrollFade } from "../common/ScrollFade";
import { useScrollEdges } from "../common/useScrollEdges";
import { scrollbarSx } from "../common/scrollbarSx";
import { useOpenAtLatest } from "../common/useOpenAtLatest";
import { format } from "../utils/mathUtils";
import { OmniHoverCard } from "./CardMediaImage";
import type { Crossing } from "./crossingsData";
import { mediumToColour, mediumToLabel } from "./types";
import { useScheme } from "../common/useScheme";
import type { Scheme } from "../utils/types";

/**
 * How many franchises the section draws. The strips are ordered by size, so the cut falls wherever
 * that order reaches twelve and not at any boundary in the data — currently part-way through a tie
 * at thirteen entries; the header states the full count so what is left off is visible rather than
 * silent.
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
 * The reader's biggest franchises, each on one shared scale.
 *
 * This is the section none of the three tabs can hold: a franchise strip on the Games tab knows
 * only about games, and the union is what lets one series be read whole. A lane per medium against
 * one epoch–today scale says which came first and how long the reader stayed with it, and the fill
 * is the only thing carrying which is which — so a franchise one medium holds is a single lane in
 * that medium's colour, which is the same reading with one term in it.
 *
 * One scale means one axis. Every strip is handed the same tick array — the section is given a
 * single one, built once by `Graphs` — so a per-strip axis is not twelve axes but the same row of
 * year labels drawn twelve times, a quarter of the section's height spent restating a scale that
 * cannot vary. Stated once beneath the stack, the labels say the same thing and the strips read as
 * one chart rather than as twelve charts that happen to agree.
 */
const Crossings = ({ crossings, ticks }: { crossings: Crossing[]; ticks: TimelineTick[] }) => {
  const scheme = useScheme();

  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
  useOpenAtLatest(scrollRef, crossings.length > 0);

  return (
    <Card>
      <SectionHeader
        icon={<Hub />}
        title="Franchises over time"
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
            sx={{
              overflowX: "auto",
              // The bar the platform may or may not draw. Where it does, this is the room for it;
              // where it does not, the fades are what say the stack runs on.
              paddingBottom: 1,
              ...scrollbarSx(theme),
            }}
          >
            <Box sx={{ width: SCALE_WIDTH }}>
              <Grid
                container
                spacing={1}
                // The whole stack is one scroller, so the strips cannot come out of step with each
                // other or with the axis: a scroller per strip would let a reader compare two rows
                // showing different decades, which is the one thing a shared scale exists to stop.
              >
                {crossings.slice(0, STRIPS_SHOWN).map((crossing) => (
                  <TimelineCard
                    key={crossing.franchise}
                    bands={crossing.bands.map((band) => toBand(band, scheme))}
                    laneCount={crossing.laneCount}
                    ticks={ticks}
                    inStack
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
 * The strip's own legend, which is what makes an unlabelled lane readable: the media are named in
 * the fills their lanes are drawn in, in the order the lanes run down the strip.
 */
const CrossingCaption = ({ crossing }: { crossing: Crossing }) => {
  const scheme = useScheme();

  return (
    <Stack
      direction="row"
      spacing={1}
      sx={{ alignItems: "center", flexWrap: "wrap" }}
    >
      <FranchiseName franchise={crossing.franchise} />
      {crossing.media.map((medium) => (
        <Stack
          key={medium}
          direction="row"
          spacing={0.5}
          sx={{ alignItems: "center" }}
        >
          <Swatch
            colour={mediumToColour(medium, scheme)}
            size={INLINE_SWATCH_SIZE}
          />
          <Typography variant="caption">{mediumToLabel(medium)}</Typography>
        </Stack>
      ))}
      <Typography variant="caption">{`${format(crossing.entries)} entries`}</Typography>
    </Stack>
  );
};

const toBand = (band: Crossing["bands"][number], scheme: Scheme): TimelineBand => ({
  key: band.key,
  startPercent: band.startPercent,
  widthPercent: band.widthPercent,
  lane: band.lane,
  colour: mediumToColour(band.item.medium, scheme),
  imprecise: !band.precise,
  hoverCard: true,
  tooltip: <LazyTooltip render={() => <OmniHoverCard item={band.item} />} />,
});

export default Crossings;
