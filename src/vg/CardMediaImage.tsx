import { CardContent, Typography } from "@mui/material";
import { CardMediaImage, DetailCard, TimelineCard, TypedCardMediaImage } from "../common/Card";
import { VideoGame, companyToColor, platformToColor, ratingToColour } from "./types";
import Grid from "@mui/material/Grid";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, Year, YearMonthDay, formatDateRange } from "../common/date";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";
import { gameSpans, spanKey } from "./cardData";
import { useFranchiseGames } from "./franchiseContext";

const VgCardMediaImage: TypedCardMediaImage<VideoGame> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={() => (
      <CardContent>
        <Grid
          container
          spacing={1}
        >
          <VgTimelineCard item={item} />
          <DetailCard
            label="Start Date"
            value={item.startDate.toString()}
          />
          <DetailCard
            label="End Date"
            value={item.endDate?.toString()}
          />
          <DetailCard
            label="Days To Beat"
            value={item.numDays}
          />
          <DetailCard
            label="Hours"
            value={item.hours}
          />

          <DetailCard
            colour={statusToColour(item)}
            label="Status"
            value={item.status}
          />
          <DetailCard
            colour={companyToColor(item)}
            label="Platform"
            value={item.platform}
          />
          <DetailCard
            label="Release Date"
            value={item.releaseDate.toString()}
          />
          <DetailCard
            label="Format"
            value={item.format}
          />

          <DetailCard
            label="Developer"
            value={item.developer}
          />
          <DetailCard
            label="Publisher"
            value={item.publisher}
          />
          <DetailCard
            label="Franchise"
            value={item.franchise}
          />
          <DetailCard
            colour={ratingToColour(item)}
            label="PEGI"
            value={item.rating}
          />

          <DetailCard
            label="Genre"
            value={item.genre}
          />
          <DetailCard
            large
            label="Themes"
            value={item.theme.join(" - ")}
          />
        </Grid>
      </CardContent>
    )}
    {...props}
  />
);

const VG_EPOCH = YearMonthDay.get(2004, 1, 1);
const VG_TICKS = stripYearTicks(VG_EPOCH, CURRENT_PLAINDATE);

/**
 * The whole franchise, not just the game the card is about: a series played across a decade is
 * the thing the strip has to say, and the opened game is where in it you are.
 */
const VgTimelineCard = ({ item: game }: { item: VideoGame }) => {
  const franchise = useFranchiseGames(game);

  const { bands, laneCount } = buildStrip(gameSpans(franchise, CURRENT_PLAINDATE), VG_EPOCH, CURRENT_PLAINDATE);

  if (bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band) => ({
        ...band,
        colour: platformToColor(band.game),
        muted: band.key !== spanKey(game),
        imprecise: !band.precise,
        tooltip: <GameTooltip game={band.game} />,
      }))}
      laneCount={laneCount}
      ticks={VG_TICKS}
      caption={franchise.length > 1 ? `${game.franchise} · ${franchise.length} games` : undefined}
    />
  );
};

const GameTooltip = ({ game }: { game: VideoGame }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      {game.name}
    </Typography>
    {game.startDate instanceof Year ? (
      // The year is all the sheet holds, so it is all this says. Where the band sits inside that
      // year is an estimate, and the caption is what stops it being read as a date.
      <>
        <Typography>Played in {game.startDate.toString()}</Typography>
        <Typography
          variant="caption"
          sx={{ opacity: 0.7 }}
        >
          No month recorded — placed by release date
        </Typography>
      </>
    ) : (
      <Typography>{formatDateRange(game.startDate, game.endDate)}</Typography>
    )}
    {game.numDays ? <Typography>{game.numDays} Days</Typography> : null}
    {game.hours ? <Typography>{game.hours} Hours</Typography> : null}
  </>
);

export default VgCardMediaImage;
