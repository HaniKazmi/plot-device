import { CardContent, Typography } from "@mui/material";
import { CardMediaImage, DetailCard, TimelineCard, TypedCardMediaImage } from "../common/Card";
import { Season, Show, isShow } from "./types";
import Grid from "@mui/material/Grid";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import { buildStrip, stripYearTicks } from "../common/timelineStripData";

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
  const show = isShow(item) ? item : item.show;
  return (
    <CardMediaImage
      alt={show.name}
      image={show.banner}
      detailComponent={() => (
        <CardContent>
          <Grid
            container
            spacing={1}
          >
            <ShowTimelineCard item={show} />
            <DetailCard
              label="Start Date"
              value={show.startDate.toString()}
            />
            <DetailCard
              label="End Date"
              value={show.endDate?.toString()}
            />
            <DetailCard
              colour={statusToColour(show)}
              label="Status"
              value={show.status}
            />
            <DetailCard
              label="Last Watched"
              value={`S${show.s.length}E${show.s.at(-1)!.e}`}
            />
            <DetailCard
              label="Hours"
              value={Math.floor(show.minutes / 60)}
            />
            <DetailCard
              label="Episodes"
              value={show.e}
            />
          </Grid>
        </CardContent>
      )}
      {...props}
    />
  );
};

const SHOW_EPOCH = YearMonthDay.get(2008, 1, 1);
const SHOW_TICKS = stripYearTicks(SHOW_EPOCH, CURRENT_PLAINDATE);

const ShowTimelineCard = ({ item }: { item: Show }) => {
  const { bands, laneCount } = buildStrip(
    item.s.map((season) => ({
      key: `S${season.s}`,
      start: season.startDate,
      end: season.endDate ?? CURRENT_PLAINDATE,
      season,
    })),
    SHOW_EPOCH,
    CURRENT_PLAINDATE,
  );

  if (bands.length === 0) return null;

  return (
    <TimelineCard
      bands={bands.map((band, index) => ({
        ...band,
        // One hue in two strengths. Alternating across two palette colours makes adjacent seasons
        // distinguishable but reads as two different things being plotted.
        colour: index % 2 === 0 ? "secondary.light" : "secondary.main",
        tooltip: <SeasonTooltip season={band.season} />,
      }))}
      laneCount={laneCount}
      ticks={SHOW_TICKS}
      caption={`${item.s.length} ${item.s.length === 1 ? "season" : "seasons"}`}
    />
  );
};

const SeasonTooltip = ({ season }: { season: Season }) => (
  <>
    <Typography
      variant="h6"
      align="center"
    >
      S{season.s}
    </Typography>
    <Typography>{formatDateRange(season.startDate, season.endDate)}</Typography>
    <Typography>{season.e} Episodes</Typography>
    <Typography>{Math.floor(season.minutes / 60)} Hours</Typography>
  </>
);

export default ShowCardMediaImage;
