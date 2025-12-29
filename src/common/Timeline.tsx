import { Card, CardContent } from "@mui/material";
import { type ReactNode } from "react";
import type { Colour } from "../utils/types";
import TimeLineChart from "./TimelineChart";
import type { YearMonthDay } from "./date";

export interface TimelineData {
  row: string;
  name: string;
  tooltip: React.ReactNode;
  colour: Colour;
  start: YearMonthDay;
  end: YearMonthDay;
}

const Timeline = ({ data, children }: { data: TimelineData[]; showRowLabels?: boolean; children?: ReactNode }) => {
  return (
    <Card>
      {children}
      <CardContent>
        <TimeLineChart timelineData={data} />
      </CardContent>
    </Card>
  );
};

export default Timeline;
