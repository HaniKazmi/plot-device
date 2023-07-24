import { CardHeader, FormControlLabel, FormGroup, Switch } from "@mui/material";
import { useState } from "react";
import { VideoGame, companyToColor } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";
import Timeline from "../common/Timeline";

const VgTimeline = ({ data }: { data: VideoGame[] }) => {
  const [groupData, setGroupData] = useState(false);

  const groupFunc = groupData ? ({ company }: VideoGame) => company : () => "*";
  const gameData: [string, string, string, Date, Date][] = data
    .filter(({ exactDate, startDate }) => exactDate && startDate.getFullYear() > 2014)
    .map((row) => [
      groupFunc(row),
      row.name,
      tooltip(row),
      row.startDate!,
      row.endDate || CURRENT_DATE]);

  return (
    <Timeline data={gameData} >
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Group Data"
              control={<Switch checked={groupData} onChange={(_, checked) => setGroupData(checked)} />}
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

const tooltip = (row: VideoGame) =>
  `
    <div style="display: flex; background-color: ${companyToColor(row)}" class="backgroundPaper">
      <div>
        <ul style="list-style-type: none;padding-left: 5px">
          <li>
            <span><b>${row.name}</b></span>
          </li>
        </ul>
        <hr />
        <ul style="list-style-type: none;padding-left: 10px">
          <li>
            <span><b>Hours: </b></span>
            <span">${row.hours}</span>
          </li>
          <li>
            <span><b>Period: </b></span>
            <span>${row.startDate?.toLocaleDateString()} - ${row.endDate?.toLocaleDateString() ?? 'present'} </span>
          </li>
          <li>
            <span><b>Days: </b></span>
            <span>${row.numDays || "-"}</span>
          </li>
        </ul>
      </div>
      ${row.banner ? `<img src="${row.banner}" style="height: 150px" /><hr />` : ''}
    </div>
  `;

export default VgTimeline;
