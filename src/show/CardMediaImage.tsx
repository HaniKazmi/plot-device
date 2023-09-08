import { CardContent, Typography } from "@mui/material";
import {
  CardMediaImage,
  DetailCard,
  TimelineActivatedSegment,
  TimelineCard,
  TimelineEmptySegment,
  TypedCardMediaImage,
} from "../common/Card";
import { Season, Show, isShow } from "./types";
import Grid from "@mui/material/Unstable_Grid2/Grid2";
import { statusToColour } from "../vg/types";
import { CURRENT_DATE, dateDiffInDays } from "../utils/dateUtils";

const ShowCardMediaImage = <T extends Show | Season>({ item, ...props }: Parameters<TypedCardMediaImage<T>>[0]) => {
  const show = isShow(item) ? item : item.show;
  return (
    <CardMediaImage
      alt={show.name}
      image={show.banner}
      detailComponent={(colour) => (
        <CardContent sx={{ background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
          <Grid container spacing={1}>
            <ShowTimelineCard colour={colour} item={show} />
            <DetailCard colour={colour} label="Start Date" value={show.startDate.toLocaleDateString()} />
            <DetailCard colour={colour} label="End Date" value={show.endDate?.toLocaleDateString()} />
            <DetailCard colour={statusToColour(show)} label="Status" value={show.status} />
            <DetailCard colour={colour} label="Last Watched" value={`S${show.s.length}E${show.s.at(-1)!.e}`} />
            <DetailCard colour={colour} label="Hours" value={Math.floor(show.minutes / 60)} />
            <DetailCard colour={colour} label="Episodes" value={show.e} />
          </Grid>
        </CardContent>
      )}
      {...props}
    />
  );
};

const startYear = new Date(2008, 0, 1);
const days = dateDiffInDays(startYear, CURRENT_DATE)!;

const ShowTimelineCard = ({ colour, item }: { colour?: string; item: Show }) => {
  if (!item.startDate || item.startDate < startYear) return null;
  let startDate = startYear;
  const segments = item.s.flatMap((season, index) => {
    const seasonSegments = [];

    if (startDate < season.startDate) {
      const daysToSeasonStart = dateDiffInDays(startDate, season.startDate)!;
      const percentToSeasonStart = (daysToSeasonStart / days) * 100;
      seasonSegments.push(<TimelineEmptySegment key={`${season.s}-before`} percent={percentToSeasonStart} />);
    }

    const endDate = season.endDate ?? CURRENT_DATE;
    const seasonLengthPercent = Math.max((dateDiffInDays(season.startDate, endDate)! / days) * 100, 0.5);
    seasonSegments.push(
      <TimelineActivatedSegment
        key={season.s}
        percent={seasonLengthPercent}
        backgroundColour={[
          `${index % 2 === 0 ? "secondary" : "primary"}.light`,
          `${index % 2 === 0 ? "secondary" : "primary"}.main`,
        ]}
        tooltip={
          <>
            <Typography variant="h6" align="center">
              S{season.s}
            </Typography>
            <Typography>
              {season.startDate.toLocaleDateString()} - {endDate.toLocaleDateString()}
            </Typography>
            <Typography>{season.e} Episodes</Typography>
            <Typography>{Math.floor(season.minutes / 60)} Hours</Typography>
          </>
        }
      />,
    );

    startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() + 1);
    return seasonSegments;
  });

  if (startDate < CURRENT_DATE) {
    const daysToEnd = dateDiffInDays(startDate, CURRENT_DATE)!;
    const percentToEnd = (daysToEnd / days) * 100;
    segments.push(<TimelineEmptySegment key={"last"} percent={percentToEnd} />);
  }

  return <TimelineCard segments={segments} colour={colour} />;
};

export default ShowCardMediaImage;
