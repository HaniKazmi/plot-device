import { CardHeader, FormGroup, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { Season, Show } from "./types";
import { CURRENT_DATE } from "../utils/dateUtils";
import Timeline from "../common/Timeline";

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(true);

  const titleData: [string, Show | Season, string?][] = groupData
    ? data.map((show) => [show.name, show, show.banner])
    : data.flatMap((show) =>
        show.s.map(
          (s) =>
            [`${show.name} - S${s.s}${s.subtitle ? " - " + s.subtitle : ""}`, s, show.banner] as [
              string,
              Season,
              string?
            ]
        )
      );

  const showData: [string, string, string, Date, Date][] = titleData.map(([title, s, banner]) => [
    "*",
    title,
    tooltip(title, s, banner),
    s.startDate,
    s.endDate ?? CURRENT_DATE,
  ]);

  return (
    <Timeline data={showData}>
      <CardHeader
        title="Timeline"
        action={
          <FormGroup row>
            <FormControlLabel
              label="Combine Seasons"
              control={<Switch checked={groupData} onChange={(_, checked) => setGroupData(checked)} />}
            />
          </FormGroup>
        }
      />
    </Timeline>
  );
};

const tooltip = (title: string, row: Show | Season, banner?: string) =>
  `
  <div style="display: flex;" class="backgroundPaper">
    ${banner ? `<img src="${banner}" style="height: 150px" /><hr />` : ""}  
    <div>     
      <ul style="list-style-type: none;padding: 5px">
        <li>
          <span><b>${title}</b></span>
        </li>
      </ul>
      <hr />
      <ul style="list-style-type: none;padding-left: 10px">
        <li>
          <span><b>Hours: </b></span>
          <span">${Math.round(row.minutes / 60)}</span>
        </li>
        <li>
          <span><b>Period: </b></span>
          <span>${row.startDate.toLocaleDateString()} - ${row.endDate?.toLocaleDateString()} </span>
        </li>
        <li>
          <span><b>Episodes: </b></span>
          <span>${row.e}</span>
        </li>
      </ul>
    </div>     
  </div>
  `;

export default ShowTimeline;
