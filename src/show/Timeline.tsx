import { CardHeader, FormGroup, FormControlLabel, Switch } from "@mui/material";
import { useState } from "react";
import { Season, Show } from "./types";
import Timeline, { TimelineData } from "../common/Timeline";
import { Colour, statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE } from "../common/date";

const ShowTimeline = ({ data }: { data: Show[] }) => {
  const [groupData, setGroupData] = useState(true);

  const titleData: [string, Show | Season, Colour, string?][] = groupData
    ? data.map((show) => [show.name, show, statusToColour(show), show.banner])
    : data.flatMap((show) =>
        show.s.map(
          (s) =>
            [`${show.name} - S${s.s}${s.subtitle ? " - " + s.subtitle : ""}`, s, statusToColour(show), show.banner] as [
              string,
              Season,
              Colour,
              string?,
            ],
        ),
      );

  const showData: TimelineData[] = titleData.map(([title, s, colour, banner]) => ({
    row: "*",
    name: title,
    tooltip: tooltip(title, s, banner),
    colour: colour,
    start: s.startDate.toDate(),
    end: s.endDate?.toDate() ?? CURRENT_PLAINDATE.toDate(),
  }));

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
          <span>${row.startDate.toString()} - ${row.endDate?.toString()} </span>
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
