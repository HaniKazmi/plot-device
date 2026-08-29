import { CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, YearMonthDay, formatDateRange } from "../common/date";
import VgCardMediaImage from "./CardMediaImage";
import { CardPanel } from "../common/Card";

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const [partyEnabled, setParty] = useState(false);

  const gameData: TimelineData[] = data
    .filter(({ party }) => partyEnabled || !party)
    .filter(({ startDate }) => startDate instanceof YearMonthDay && startDate.year > 2014)
    .map((row) => ({
      name: row.name,
      tooltip: () => (
        <VgCardMediaImage
          item={row}
          extractColour
          footerComponent={(accent) => (
            <CardPanel
              title={row.name}
              accent={accent}
              dateRange={formatDateRange(row.startDate, row.endDate)}
              stats={
                row.hours && row.numDays
                  ? [
                      { value: row.hours, label: "Hours" },
                      { value: row.numDays, label: "Days" },
                    ]
                  : []
              }
            />
          )}
        />
      ),
      colour: platformToColor(row),
      start: row.startDate as YearMonthDay,
      end: (row.endDate as YearMonthDay | undefined) ?? CURRENT_PLAINDATE,
    }));
  return (
    <Timeline data={gameData}>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Party"
              control={
                <Switch
                  checked={partyEnabled}
                  onChange={(_, checked) => setParty(checked)}
                />
              }
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

export default VgTimeline;
