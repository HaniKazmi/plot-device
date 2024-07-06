import { CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import { VideoGame, companyToColor } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";
import Timeline from "../common/Timeline";

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const [groupData, setGroupData] = useState(false);
  const [partyEnabled, setParty] = useState(false);


  const groupFunc = groupData ? ({ company }: VideoGame) => company : () => "*";
  const gameData: [string, string, string, Date, Date][] = data
    .filter(({ party }) => partyEnabled || !party)
    .filter(({ exactDate, startDate }) => exactDate && startDate.getFullYear() > 2014)
    .map((row) => [groupFunc(row), row.name, tooltip(row), row.startDate, row.endDate ?? CURRENT_DATE]);

  return (
    <Timeline data={gameData} showRowLabels={groupData}>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Group Data"
              control={<Switch checked={groupData} onChange={(_, checked) => setGroupData(checked)} />}
            />
            <FormControlLabel
              label="Party"
              control={<Switch checked={partyEnabled} onChange={(_, checked) => setParty(checked)} />}
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

const tooltip = (row: VideoGame) =>
  `
<div style="display: flex; border: 1px solid black; background-color: ${companyToColor(row)}" class="backgroundPaper">
  <div style="flex: 0.6; white-space:nowrap; padding: 10px; "> 
    <b>${row.name}</b><br> 
    <hr />
    Hours: ${row.hours}<br> 
    Period: ${row.startDate?.toLocaleDateString()} - ${row.endDate?.toLocaleDateString() ?? "present"}<br> 
    Days: ${row.numDays ?? "-"}
  </div>
  ${row.banner
    ? `
      <div style="flex: 1; min-width: 200px">
        <img src="${row.banner}"
        style="max-width: 100%; max-height: 200px;"> 
      </div>
   `
    : ``
  }
</div>
`;

export default VgTimeline;
