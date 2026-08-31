import { Card, CardContent, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { Hub } from "@mui/icons-material";
import { Swatch, TimelineCard, INLINE_SWATCH_SIZE, type TimelineBand } from "../common/Card";
import { LazyTooltip } from "../common/LazyTooltip";
import { SectionHeader } from "../common/SectionHeader";
import type { TimelineTick } from "../common/timelineLayout";
import { format } from "../utils/mathUtils";
import OmniCardMediaImage, { OmniCardPanel } from "./CardMediaImage";
import type { Crossing } from "./crossingsData";
import { mediumToColour, mediumToLabel } from "./types";

/**
 * How many franchises the section draws. The strips are ordered by size, so the cut falls where a
 * crossing stops being a series met twice and becomes a title that happens to appear twice; the
 * header states the full count so the cut is visible rather than silent.
 */
const STRIPS_SHOWN = 12;

/**
 * The franchises the reader met in more than one medium, each on one shared scale.
 *
 * This is the section none of the three tabs can hold: a franchise strip on the Games tab knows
 * only about games. Here a lane per medium against one epoch–today scale says which came first and
 * how long the reader stayed with it, and the fill is the only thing carrying which is which.
 */
const Crossings = ({ crossings, ticks }: { crossings: Crossing[]; ticks: TimelineTick[] }) => (
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
      <Grid
        container
        spacing={1}
      >
        {crossings.slice(0, STRIPS_SHOWN).map((crossing) => (
          <TimelineCard
            key={crossing.franchise}
            bands={crossing.bands.map(toBand)}
            laneCount={crossing.laneCount}
            ticks={ticks}
            caption={<CrossingCaption crossing={crossing} />}
          />
        ))}
      </Grid>
    </CardContent>
  </Card>
);

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
  tooltip: (
    <LazyTooltip
      render={() => (
        <OmniCardMediaImage
          item={band.item}
          extractColour
          footerComponent={<OmniCardPanel item={band.item} />}
        />
      )}
    />
  ),
});

export default Crossings;
