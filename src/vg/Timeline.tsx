import { CardHeader, FormControlLabel, FormGroup, Switch, Typography } from "@mui/material";
import { useState } from "react";
import { VideoGame, platformToColor } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { CURRENT_PLAINDATE, YearMonthDay } from "../common/date";
import VgCardMediaImage from "./CardMediaImage";
import { FooterComponent } from "../common/Card";

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const [groupData, setGroupData] = useState(false);
  const [partyEnabled, setParty] = useState(false);

  const groupFunc = groupData ? ({ company }: VideoGame) => company : () => "*";
  const gameData: TimelineData[] = data
    .filter(({ party }) => partyEnabled || !party)
    .filter(({ startDate }) => startDate instanceof YearMonthDay && startDate.year > 2014)
    .map((row) => ({
      row: groupFunc(row),
      name: row.name,
      tooltip: (
        <VgCardMediaImage
          item={row}
          footerComponent={
            <FooterComponent
              labels={[
                [<Typography variant="h6">{row.name}</Typography>],
                [`${row.startDate.toString()} - ${row.endDate?.toString() ?? "present"}`],
                [...(row.hours && row.numDays ? [`${row.hours} Hours`, `${row.numDays} Days`] : [])],
              ]}
              justify
            />
          }
        />
      ),
      colour: platformToColor(row),
      start: row.startDate as YearMonthDay,
      end: (row.endDate as YearMonthDay | undefined) ?? CURRENT_PLAINDATE,
    }));
  return (
    <Timeline
      data={gameData}
      showRowLabels={groupData}
    >
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Group Data"
              control={
                <Switch
                  checked={groupData}
                  onChange={(_, checked) => setGroupData(checked)}
                />
              }
            />
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
