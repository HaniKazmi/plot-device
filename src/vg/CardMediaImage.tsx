import { CardContent, Typography } from "@mui/material";
import {
  CardMediaImage,
  DetailCard,
  TimelineActivatedSegment,
  TimelineCard,
  TimelineEmptySegment,
  TypedCardMediaImage,
} from "../common/Card";
import { VideoGame, companyToColor, ratingToColour, statusToColour } from "./types";
import Grid from "@mui/material/Unstable_Grid2/Grid2";
import { CURRENT_DATE, dateDiffInDays } from "../utils/dateUtils";

const VgCardMediaImage: TypedCardMediaImage<VideoGame> = ({ item, ...props }) => (
  <CardMediaImage
    alt={item.name}
    image={item.banner}
    detailComponent={(colour) => (
      <CardContent sx={{ background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
        <Grid container spacing={1}>
          <VgTimelineCard colour={colour} item={item} />
          <DetailCard
            colour={colour}
            label="Start Date"
            value={item.exactDate ? item.startDate.toLocaleDateString() : item.startDate?.getFullYear()}
          />
          <DetailCard
            colour={colour}
            label="End Date"
            value={item.exactDate ? item.endDate?.toLocaleDateString() : item.endDate?.getFullYear()}
          />
          <DetailCard colour={colour} label="Days To Beat" value={item.exactDate ? item.numDays : undefined} />
          <DetailCard colour={colour} label="Hours" value={item.hours} />

          <DetailCard colour={statusToColour(item)} label="Status" value={item.status} />
          <DetailCard colour={companyToColor(item)} label="Platform" value={item.platform} />
          <DetailCard colour={colour} label="Release Date" value={item.releaseDate.toLocaleDateString()} />
          <DetailCard colour={colour} label="Format" value={item.format} />

          <DetailCard colour={colour} label="Developer" value={item.developer} />
          <DetailCard colour={colour} label="Publisher" value={item.publisher} />
          <DetailCard colour={colour} label="Franchise" value={item.franchise} />
          <DetailCard colour={ratingToColour(item)} label="PEGI" value={item.rating} />

          <DetailCard colour={colour} label="Genre" value={item.genre} />
          <DetailCard large colour={colour} label="Themes" value={item.theme.join(" - ")} />
        </Grid>
      </CardContent>
    )}
    {...props}
  />
);

const startYear = new Date(2004, 0, 1);
const days = dateDiffInDays(startYear, CURRENT_DATE)!;

const VgTimelineCard = ({ colour, item: game }: { colour?: string; item: VideoGame }) => {
  if (!game.startDate || game.startDate < startYear) return null;
  const endDate = game.endDate
    ? game.exactDate
      ? game.endDate
      : new Date(game.startDate.getFullYear(), game.startDate.getMonth() + 1, game.startDate.getDay())
    : CURRENT_DATE;
  const startDays = dateDiffInDays(startYear, game.startDate)!;
  const startPercent = (startDays / days) * 100;
  const gameLengthPercent = Math.max(((game.numDays ?? dateDiffInDays(game.startDate, endDate)!) / days) * 100, 0.5);
  const endPercent = 100 - gameLengthPercent - startPercent;

  return (
    <TimelineCard
      segments={[
        <TimelineEmptySegment key={0} percent={startPercent} />,
        <TimelineActivatedSegment
          key={1}
          percent={gameLengthPercent}
          backgroundColour={["secondary.dark", "secondary.light"]}
          tooltip={
            <>
              {game.exactDate ? (
                <>
                  <Typography>
                    Played {game.startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
                  </Typography>
                  <Typography>{game.numDays} Days</Typography>
                </>
              ) : (
                <Typography>Played in {game.startDate.getFullYear()}</Typography>
              )}
              <Typography>{game.hours} Hours</Typography>
            </>
          }
        />,
        <TimelineEmptySegment key={2} percent={endPercent} />,
      ]}
      colour={colour}
    />
  );
};

export default VgCardMediaImage;
