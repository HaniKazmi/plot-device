import { Box, Card, CardContent, Stack, useTheme, Typography, type Theme } from "@mui/material";
import { NothingToPlot } from "../common/NothingMatches";
import { useState, type ReactNode } from "react";
import Grid from "@mui/material/Grid";
import { Hub } from "@mui/icons-material";
import { INLINE_SWATCH_SIZE, Swatch } from "../common/Swatch";
import { TimelineAxis, TimelineBandBox, TimelineScale, type TimelineBand } from "../common/TimelineBand";
import { useArtworkPalette } from "../common/artworkPalette";
import { FADE_Z } from "../common/ScrollFade";
import { shortYear } from "../common/date";
import { FranchiseName } from "../common/FranchiseStrip";
import { LazyTooltip } from "../common/LazyTooltip";
import { SectionHeader } from "../common/SectionHeader";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { TimeLineChart } from "../common/Timeline";
import { FoldedContent } from "../common/FoldedChart";
import type { TimelineTick } from "../common/timelineLayout";
import { ScrollFade } from "../common/ScrollFade";
import { useScrollEdges } from "../common/useScrollEdges";
import { CONTAIN_SIDEWAYS_SCROLL, scrollbarSx } from "../common/scrollbarSx";
import { useOpenAtLatest } from "../common/useOpenAtLatest";
import { format } from "../utils/mathUtils";
import { all } from "../common/population";
import { ExpandableCard } from "../common/Stats";
import { OmniHoverCard } from "../app/CardMediaImage";
import type { Crossing } from "./crossingsData";
import type { OmniItem } from "../common/medium";
import { omniTimeline } from "./timelineData";
import { CURRENT_PLAINDATE } from "../common/date";
import { mediumToColour, mediumToLabel } from "../app/types";
import { useScheme } from "../common/useScheme";
import type { Scheme } from "../utils/types";

/**
 * How many franchises the card draws, and how many stand in one stack of the dialog. The strips
 * are ordered by size, so the cut falls wherever that order reaches twelve and not at any boundary
 * in the data — currently part-way through a tie at thirteen entries; the card's own control reads
 * "All 180 ›", so what is left off is both visible and one press away.
 */
const STRIPS_SHOWN = 12;

/** The section's name, stated by the card, by the dialog it opens and by that dialog's own bar. */
const CROSSINGS_TITLE = "Franchises over time";

/**
 * The horizontal inset a strip sits at inside its own card, which the shared axis has to match to
 * line up with the strips above it. One number, because the two are the same edge.
 */
const STRIP_INSET = 1;
const STRIP_HEIGHT = 3;
/** Sparse enough that the year labels do not collide at card width, and land on round years. */
const LABEL_EVERY_YEARS = 5;

/**
 * One strip of the stack: its franchise's name pinned at the strip's own inset, and its bands on
 * a track over the shared gridlines. The card stops clipping because a caption cannot be sticky
 * inside a box that hides its overflow, and the caption pins at the strip's inset rather than the
 * scroller's edge — a sticky offset is measured from the scrollport, so a zero rests the name
 * where it belongs and then steps a padding's width left of every band it labels as soon as the
 * reader scrolls. The years are stated once beneath the stack rather than under every strip.
 */
const CrossingStrip = ({
  bands,
  laneCount,
  ticks,
  caption,
}: {
  bands: TimelineBand[];
  laneCount: number;
  ticks: TimelineTick[];
  caption: ReactNode;
}) => {
  const palette = useArtworkPalette();

  return (
    <Grid size={12}>
      <Card
        variant="elevation"
        sx={{ height: "100%", background: "unset", color: "unset", overflow: "visible" }}
      >
        <CardContent
          sx={{ ":last-child": { paddingBottom: STRIP_INSET }, height: "100%", padding: STRIP_INSET, paddingTop: 0 }}
        >
          <Typography
            variant="caption"
            // One line, whatever the name in it turned out to be: a caption that wraps pushes the
            // strip down by its own height, and the strip is what the card is measuring.
            noWrap
            sx={{
              display: "block",
              opacity: 0.7,
              paddingBottom: 0.5,
              position: "sticky",
              left: (theme: Theme) => theme.spacing(STRIP_INSET),
              width: "fit-content",
              maxWidth: "100%",
              zIndex: FADE_Z + 1,
            }}
          >
            {caption}
          </Typography>
          <Box
            sx={{
              position: "relative",
              height: (theme) => theme.spacing(STRIP_HEIGHT),
              borderRadius: 1,
              overflow: "hidden",
              // The empty track and the gridlines are drawn on the card's ground, so they are
              // taken from it rather than from tokens mixed for the theme's own background.
              backgroundColor: palette.tile,
            }}
          >
            <TimelineScale
              ticks={ticks}
              colour={palette.line}
            />
            {bands.map((band) => (
              <TimelineBandBox
                {...band}
                laneCount={laneCount}
                key={band.key}
              />
            ))}
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
};

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
/**
 * The two readings of the section: the biggest franchises as strips on one scale, or every item
 * as a bar on the packed timeline the four tabs draw one medium at a time. Words rather than icons,
 * as every such control on the page; held in state here rather than at module scope, since the
 * franchise reading is what the page opens on and a reader switching to everything has asked for a
 * one-off look rather than a setting.
 */
type CrossingsMode = "Franchises" | "All";
const CROSSINGS_MODES: readonly SegmentOption<CrossingsMode>[] = [
  { value: "Franchises", label: "Franchises" },
  { value: "All", label: "All" },
];

const Crossings = ({
  crossings,
  ticks,
  items,
}: {
  crossings: Crossing[];
  ticks: TimelineTick[];
  /** The union the crossings were grouped from, for the reading that draws every item of it. */
  items: OmniItem[];
}) => {
  const scheme = useScheme();
  const biggest = crossings[0];
  const [mode, setMode] = useState<CrossingsMode>("Franchises");
  const everything = mode === "All";
  // Built only while that reading is chosen: the section opens on the franchises, and a thousand
  // rows positioned for a chart the reader has not asked for is the work the fold exists to avoid.
  const rows = everything
    ? omniTimeline(items, CURRENT_PLAINDATE, scheme, (item) => () => <OmniHoverCard item={item} />)
    : [];

  return (
    <ExpandableCard
      title={CROSSINGS_TITLE}
      // The strips the collapsed card has no room for are the whole point of the dialog, so the
      // reading that draws every row of the union has nothing to expand into. Its own count is
      // gone with the rest: the chart is over the page's population, which the rail states.
      expandable={!everything && crossings.length > STRIPS_SHOWN}
      cutLabel={all(crossings.length)}
      renderContent={(isDialog, toggle) =>
        isDialog ? (
          <>
            <SectionHeader
              icon={<Hub />}
              title={CROSSINGS_TITLE}
              action={toggle}
              compactActions
            />
            {/* Every franchise, in stacks of the twelve the card itself draws. One scroller per
                stack rather than one for all of them: a scroller is what holds a shared scale
                true, and twelve strips is as much of one as a screen shows — a single scroller
                a hundred and eighty rows deep is a scale nothing on screen can be compared
                across anyway. */}
            {pages(crossings).map((page) => (
              <CrossingsStack
                key={page[0].franchise}
                crossings={page}
                ticks={ticks}
              />
            ))}
          </>
        ) : (
          <FoldedContent
            icon={<Hub />}
            title={CROSSINGS_TITLE}
            /* Which reading the stack draws is a choice about a stack that is not mounted while
               the card is folded; the cut stands either way, being the way to the franchises the
               card has no room for rather than a setting on the ones it does. */
            controls={
              <SegmentedControl
                options={CROSSINGS_MODES}
                value={mode}
                onChange={setMode}
                ariaLabel="What the timeline draws"
              />
            }
            action={toggle}
            // The strips are ordered by size, so the first one is the largest series the reader has
            // met — the fact the stack is opened for, and the one a phone can state without drawing
            // it.
            fold={() => ({
              summary: biggest
                ? `${biggest.franchise} is the largest, ${format(biggest.entries)} entries across ${format(biggest.media.length)} media`
                : "",
            })}
          >
            {everything ? (
              <CardContent>
                {/* Every bare-year span is left out of this reading, so a year of games alone can
                    have strips to draw and no rows at all; the chart itself draws nothing for an
                    empty list. */}
                {rows.length > 0 ? <TimeLineChart timelineData={rows} /> : <NothingToPlot />}
              </CardContent>
            ) : (
              <CrossingsStack
                crossings={crossings.slice(0, STRIPS_SHOWN)}
                ticks={ticks}
              />
            )}
          </FoldedContent>
        )
      }
    />
  );
};

/** The franchises in the runs a stack draws, so the dialog is stacks of twelve down the page. */
const pages = (crossings: Crossing[]): Crossing[][] =>
  Array.from({ length: Math.ceil(crossings.length / STRIPS_SHOWN) }, (_, index) =>
    crossings.slice(index * STRIPS_SHOWN, (index + 1) * STRIPS_SHOWN),
  );

/**
 * One stack of strips, apart from the card that holds it, because both its hooks measure the
 * scroller.
 *
 * A folded card does not render this at all until the reader opens it, and `useOpenAtLatest` fires
 * once for a library that has data: mounted with the card, it would find no element on that one
 * run and the stack would open at the epoch, the oldest end of a scale whose point is the newest.
 *
 * It draws exactly the franchises it is handed, so the card can pass the twelve biggest and the
 * dialog can pass every run of twelve.
 */
const CrossingsStack = ({ crossings, ticks }: { crossings: Crossing[]; ticks: TimelineTick[] }) => {
  const scheme = useScheme();

  const [scrollRef, edges] = useScrollEdges<HTMLDivElement>();
  const theme = useTheme();
  useOpenAtLatest(scrollRef, crossings.length > 0);

  return (
    <CardContent>
      <ScrollFade
        edges={edges}
        ground={theme.vars.palette.background.paper}
      >
        <Box
          ref={scrollRef}
          sx={{
            overflowX: "auto",
            ...CONTAIN_SIDEWAYS_SCROLL,
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
              {crossings.map((crossing) => (
                <CrossingStrip
                  key={crossing.franchise}
                  bands={crossing.bands.map((band) => toBand(band, scheme))}
                  laneCount={crossing.laneCount}
                  ticks={ticks}
                  caption={<CrossingCaption crossing={crossing} />}
                />
              ))}
            </Grid>
            {/* At the strips' own inset, so a year label stands under the gridline it names. */}
            <Box sx={{ paddingX: STRIP_INSET, marginTop: 0.25 }}>
              <TimelineAxis
                ticks={ticks.filter((tick) => tick.year % LABEL_EVERY_YEARS === 0)}
                labelOf={(tick) => shortYear(tick.year)}
                align="centre"
              />
            </Box>
          </Box>
        </Box>
      </ScrollFade>
    </CardContent>
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
