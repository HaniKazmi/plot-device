import { CardHeader, FormGroup, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { Season, Show, isShow } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { Colour, statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, formatDateRange } from "../common/date";
import ShowCardMediaImage from "./CardMediaImage";
import { CardPanel } from "../common/Card";

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(false);

  const titleData: [string, Show | Season, Colour][] = groupData
    ? data.map((show) => [show.name, show, statusToColour(show)])
    : data.flatMap((show) =>
        show.s.map((s) => [`${show.name} - S${s.s}`, s, statusToColour(show)] as [string, Season, Colour]),
      );

  const showData: TimelineData[] = titleData.map(([title, s, colour]) => ({
    name: title,
    tooltip: () => (
      <ShowCardMediaImage
        landscape
        item={s}
        extractColour
        footerComponent={(accent) => (
          <CardPanel
            landscape
            title={isShow(s) ? s.name : s.show.name}
            badge={isShow(s) ? undefined : `Season ${s.s}`}
            accent={accent}
            dateRange={formatDateRange(s.startDate, s.endDate)}
            stats={[
              { value: s.e, unit: "eps", label: "Watched" },
              { value: Math.round(s.minutes / 60), unit: "hrs", label: "Runtime" },
            ]}
          />
        )}
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
