import { CardContent, Typography } from "@mui/material";
import {
  CardMediaImage,
  DetailCard,
  TimelineActivatedSegment,
  TimelineCard,
  TimelineEmptySegment,
  TypedCardMediaImage,
} from "../common/Card";
import { VideoGame, companyToColor, ratingToColour } from "./types";
import Grid from "@mui/material/Grid";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, YearMonthDay } from "../common/date";

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

const startYear = YearMonthDay.get(2004, 1, 1);
const days = startYear.daysTo(CURRENT_PLAINDATE)!;

const VgTimelineCard = ({ item: game }: { item: VideoGame }) => {
  if (game.startDate < startYear) return null;

  const startDate = game.startDate.startOfYear();
  const endDate = game.endDate
    ? game.endDate instanceof YearMonthDay
      ? game.endDate
      : startDate.addMonth()
    : CURRENT_PLAINDATE;
  const startDays = startYear.daysTo(startDate)!;
  const startPercent = (startDays / days) * 100;
  const gameLengthPercent = Math.max(((game.numDays ?? startDate.daysTo(endDate)!) / days) * 100, 0.5);
  const endPercent = 100 - gameLengthPercent - startPercent;

  return (
    <TimelineCard
      segments={[
        <TimelineEmptySegment
          key={0}
          percent={startPercent}
        />,
        <TimelineActivatedSegment
          key={1}
          percent={gameLengthPercent}
          backgroundColour={["secondary.dark", "secondary.light"]}
          tooltip={
            <>
              {game.numDays ? (
                <>
                  <Typography>
                    Played {game.startDate.toString()} - {endDate.toString()}
                  </Typography>
                  <Typography>{game.numDays} Days</Typography>
                </>
              ) : (
                <Typography>Played in {game.startDate.toString()}</Typography>
              )}
              <Typography>{game.hours} Hours</Typography>
            </>
          }
        />,
        <TimelineEmptySegment
          key={2}
          percent={endPercent}
        />,
      ]}
    />
  );
};

export default VgCardMediaImage;
