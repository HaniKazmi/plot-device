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
import Grid from "@mui/material/Grid";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, YearMonthDay } from "../common/date";
import type { ReactNode } from "react";

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

const startYear = YearMonthDay.get(2008, 1, 1);
const days = startYear.daysTo(CURRENT_PLAINDATE)!;

const ShowTimelineCard = ({ item }: { item: Show }) => {
  if (!item.startDate || item.startDate < startYear) return null;
  const segments: ReactNode[] = [];
  let lastDate = startYear;

  item.s.forEach((season, index) => {
    // Calculate the empty gap from the last date to this season's start.
    if (lastDate < season.startDate) {
      const daysToSeasonStart = lastDate.daysTo(season.startDate)!;
      const percentToSeasonStart = (daysToSeasonStart / days) * 100;
      segments.push(
        <TimelineEmptySegment
          key={`${season.s}-before`}
          percent={percentToSeasonStart}
        />,
      );
    }

    const endDate = season.endDate ?? CURRENT_PLAINDATE;
    const seasonLengthPercent = Math.max((season.startDate.daysTo(endDate)! / days) * 100, 0.5);

    segments.push(
      <TimelineActivatedSegment
        key={season.s}
        percent={seasonLengthPercent}
        backgroundColour={[
          `${index % 2 === 0 ? "secondary" : "primary"}.light`,
          `${index % 2 === 0 ? "secondary" : "primary"}.main`,
        ]}
        tooltip={
          <>
            <Typography
              variant="h6"
              align="center"
            >
              S{season.s}
            </Typography>
            <Typography>
              {season.startDate.toString()} - {endDate.toString()}
            </Typography>
            <Typography>{season.e} Episodes</Typography>
            <Typography>{Math.floor(season.minutes / 60)} Hours</Typography>
          </>
        }
      />,
    );

    lastDate = endDate.increment();
  });

  if (lastDate < CURRENT_PLAINDATE) {
    const daysToEnd = lastDate.daysTo(CURRENT_PLAINDATE)!;
    const percentToEnd = (daysToEnd / days) * 100;
    segments.push(
      <TimelineEmptySegment
        key={"last"}
        percent={percentToEnd}
      />,
    );
  }

  return <TimelineCard segments={segments} />;
};

export default ShowCardMediaImage;
