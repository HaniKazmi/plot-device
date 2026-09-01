import { FormGroup, FormControlLabel, Switch } from "@mui/material";
import { Timeline as TimelineIcon } from "@mui/icons-material";
import { useState } from "react";
import { SectionHeader } from "../common/SectionHeader";
import { format } from "../utils/mathUtils";
import { Season, Show } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { Colour, statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE } from "../common/date";
import { ShowHoverCard } from "./CardMediaImage";
import { useScheme } from "../common/useScheme";

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const scheme = useScheme();

  const [groupData, setGroupData] = useState(false);

  const titleData: [string, Show | Season, Colour][] = groupData
    ? data.map((show) => [show.name, show, statusToColour(show, scheme)])
    : data.flatMap((show) =>
        show.s.map((s) => [`${show.name} - S${s.s}`, s, statusToColour(show, scheme)] as [string, Season, Colour]),
      );

  const showData: TimelineData[] = titleData.map(([title, s, colour]) => ({
    name: title,
    tooltip: () => (
      <ShowHoverCard
        item={s}
        title={title}
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
