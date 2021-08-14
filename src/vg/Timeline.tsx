import { useState } from "react";
import Chart from "react-google-charts";
import { CheckBox } from "./CheckBox";
import { VideoGame } from "./Types";

const Timeline = ({ data }: { data: VideoGame[] }) => {
  const [groupData, setGroupData] = useState(false);
  const [filterEndless, setFilterEndless] = useState(false);

  const groupFunc = groupData ? ({ company }: VideoGame) => company : () => "*";
  const filterEndlessFunc = filterEndless ? ({ status }: VideoGame) => status !== "Endless" : () => true;

  const timelineData: any[] = [
    [
      { type: "string", id: "Company" },
      { type: "string", id: "Game" },
      { type: "string", role: "tooltip" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" }
    ]
  ];

  const gameData = data
    .filter(({ exactDate }) => exactDate)
    .filter(filterEndlessFunc)
    .filter(({ startDate }) => startDate?.getFullYear()! > 2014)
    .map((row) => [groupFunc(row), row.game, tooltip(row), row.startDate, row.endDate]);

  return (
    <div>
      <CheckBox label="Group Data" value={groupData} setValue={setGroupData} />
      <CheckBox label="Filter Endless" value={filterEndless} setValue={setFilterEndless} />
      <br />
      <div style={{ overflow: "auto", overflowY: "clip" }}>
        <Chart style={{ width: "400vw", height: "65vh" }} chartType="Timeline" data={timelineData.concat(gameData)} />
      </div>
    </div>
  );
};

const tooltip = (row: VideoGame) =>
  `
    <div style="display: inline-block">
        <ul style="list-style-type: none;padding: 5px">
            <li>
                <span><b>${row.game}</b></span>
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
                <span>${row.startDate?.toLocaleDateString()} - ${row.endDate?.toLocaleDateString()} </span>
            </li>
            <li>
                <span><b>Num Days: </b></span>
                <span>${date_diff_in_days(row.startDate!, row.endDate!)}</span>
            </li>
        </ul>
    </div>
    `;

const date_diff_in_days = (dt1: Date, dt2: Date) =>
  Math.floor(
    (Date.UTC(dt2.getFullYear(), dt2.getMonth(), dt2.getDate()) -
      Date.UTC(dt1.getFullYear(), dt1.getMonth(), dt1.getDate())) /
    (1000 * 60 * 60 * 24) + 1
  );

export default Timeline;
