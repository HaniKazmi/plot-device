import { FormGroup, FormControlLabel, Switch } from "@mui/material";
import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { format } from "../utils/mathUtils";
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
        footerComponent={
          <CardPanel
            layout="beside"
            // The chart's own label for the bar, so the card names exactly what was hovered — a
            // season, or a whole show when the seasons are combined.
            title={title}
            subtitle={isShow(s) ? undefined : s.subtitle}
            dateRange={formatDateRange(s.startDate, s.endDate)}
            stats={[
              { value: s.e, label: "Eps" },
              { value: Math.round(s.minutes / 60), label: "Hours" },
            ]}
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
      <SectionHeader
        icon={<TimelineIcon />}
        title={groupData ? "Every show" : "Every season"}
        // The bars actually drawn, which the switch beside it changes from one per season to one
        // per show — so the title and the count turn over with the bars rather than outliving them.
        count={`${format(titleData.length)} ${groupData ? "shows" : "seasons"}`}
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
