import { CardHeader, FormGroup, FormControlLabel, Switch, Typography } from "@mui/material";
import { useState } from "react";
import { Season, Show } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { Colour, statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE } from "../common/date";
import ShowCardMediaImage from "./CardMediaImage";
import { FooterComponent } from "../common/Card";

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(false);

  const titleData: [string, Show | Season, Colour][] = groupData
    ? data.map((show) => [show.name, show, statusToColour(show)])
    : data.flatMap((show) =>
        show.s.map(
          (s) =>
            [`${show.name} - S${s.s}${s.subtitle ? " - " + s.subtitle : ""}`, s, statusToColour(show)] as [
              string,
              Season,
              Colour,
            ],
        ),
      );

  const showData: TimelineData[] = titleData.map(([title, s, colour]) => ({
    name: title,
    tooltip: (
      <ShowCardMediaImage
        landscape
        item={s}
        extractColour
        footerComponent={
          <FooterComponent
            labels={[
              [<Typography variant="h6">{title}</Typography>],
              [`${s.startDate.toString()} - ${s.endDate?.toString() ?? "present"}`],
              [...(s.e && s.minutes ? [`${s.e} Eps`, `${Math.round(s.minutes / 60)} Hours`] : [])],
            ]}
            justify
          />
        }
      />
    ),
    colour: colour,
    start: s.startDate,
    end: s.endDate ?? CURRENT_PLAINDATE,
  }));

  return (
    <Timeline data={showData}>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Combine Seasons"
              control={
                <Switch
                  checked={groupData}
                  onChange={(_, checked) => setGroupData(checked)}
                />
              }
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

export default ShowTimeline;
