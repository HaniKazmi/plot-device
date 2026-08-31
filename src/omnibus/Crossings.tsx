import { Card, CardContent, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { Hub } from "@mui/icons-material";
import { CardPanel, Swatch, TimelineCard, INLINE_SWATCH_SIZE, type TimelineBand } from "../common/Card";
import { LazyTooltip } from "../common/LazyTooltip";
import { SectionHeader } from "../common/SectionHeader";
import { formatDate, formatDateRange } from "../common/date";
import type { TimelineTick } from "../common/timelineLayout";
import { format } from "../utils/mathUtils";
import MovieCardMediaImage from "../movie/CardMediaImage";
import type { Movie } from "../movie/types";
import ShowCardMediaImage from "../show/CardMediaImage";
import type { Season } from "../show/types";
import VgCardMediaImage from "../vg/CardMediaImage";
import type { VideoGame } from "../vg/types";
import type { OmniItem } from "./adapter";
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
  tooltip: <LazyTooltip render={() => <CrossingCard item={band.item} />} />,
});

/**
 * The hovered entry, as its own tab's card.
 *
 * A switch here rather than a `TypedCardMediaImage<OmniItem>` of its own: the mixed-media adapter
 * is what the browse surfaces need and this is the one surface wanting it so far. The three
 * franchise indexes are provided above this tab, so a card's own strip answers with its series.
 */
const CrossingCard = ({ item }: { item: OmniItem }) => {
  switch (item.medium) {
    case "game": {
      const game = item.source as VideoGame;
      return (
        <VgCardMediaImage
          item={game}
          extractColour
          footerComponent={
            <CardPanel
              layout="beside"
              title={game.name}
              subtitle={game.platform}
              dateRange={formatDateRange(game.startDate, game.endDate)}
              stats={game.hours ? [{ value: game.hours, label: "Hours" }] : []}
            />
          }
        />
      );
    }
    case "show": {
      const season = item.source as Season;
      return (
        <ShowCardMediaImage
          item={season}
          extractColour
          footerComponent={
            <CardPanel
              layout="beside"
              title={`${season.show.name} S${season.s}`}
              subtitle={season.show.network}
              dateRange={formatDateRange(season.startDate, season.endDate)}
              stats={[
                { value: season.e, label: "Eps" },
                { value: Math.floor(season.minutes / 60), label: "Hours" },
              ]}
            />
          }
        />
      );
    }
    case "movie": {
      const movie = item.source as Movie;
      return (
        <MovieCardMediaImage
          item={movie}
          extractColour
          footerComponent={
            <CardPanel
              layout="beside"
              title={movie.name}
              subtitle={movie.director}
              dateRange={formatDate(movie.startDate)}
              stats={[{ value: movie.minutes, label: "Min" }]}
            />
          }
        />
      );
    }
  }
};

export default Crossings;
