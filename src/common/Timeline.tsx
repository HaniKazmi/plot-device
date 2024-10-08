import { Box, Card, CardContent, useTheme } from "@mui/material";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import Chart from "react-google-charts";
import type { Colour } from "../utils/types";

const DEFAULT_HEIGHT = 90;

export interface TimelineData {
  row: string;
  name: string;
  tooltip: string;
  colour: Colour;
  start: Date;
  end: Date;
}

const Timeline = ({
  data,
  showRowLabels = false,
  children,
}: {
  data: TimelineData[];
  showRowLabels?: boolean;
  children?: ReactNode;
}) => {
  const [height, setHeight] = useState<string | number>(DEFAULT_HEIGHT + "vh");
  const theme = useTheme();

  const timelineHeader = [
    [
      { type: "string", id: "*" },
      { type: "string", id: "Name" },
      { type: "string", role: "tooltip" },
      { type: "string", id: "style", role: "style" },
      { type: "date", id: "Start" },
      { type: "date", id: "End" },
    ],
  ];

  const callback = useCallback(() => {
    const labels = document.getElementsByTagName("text");
    for (const label of labels) {
      if (label.getAttribute("text-anchor") === "middle") {
        label.setAttribute("fill", theme.palette.text.secondary);
      }
    }

    const rects = document.getElementsByTagName("rect");
    for (const rect of rects) {
      if (rect.getAttribute("stroke") === "#9a9a9a") {
        const newHeight = rect.height.baseVal.value + 50;
        setHeight(
          newHeight < document.documentElement.clientHeight * (DEFAULT_HEIGHT / 100)
            ? newHeight
            : DEFAULT_HEIGHT + "vh",
        );
      }
    }
  }, [theme.palette.text.secondary]);

  useEffect(() => {
    window.addEventListener("resize", callback);
    return () => window.removeEventListener("resize", callback);
  }, [callback]);

  if (data.length === 0) {
    return;
  }

  return (
    <Box
      sx={{
        ".backgroundPaper": {
          backgroundColor: "background.paper",
        },
      }}
    >
      <Card>
        {children}
        <CardContent>
          <Box sx={{ overflowX: "auto", overflowY: "hidden" }}>
            <Chart
              key={height}
              width="400vw"
              height={height}
              chartType="Timeline"
              data={[
                ...timelineHeader,
                ...data.map((row) => [row.row, row.name, row.tooltip, row.colour, row.start, row.end]),
              ]}
              onLoad={() => {
                setTimeout(callback, 50);
              }}
              chartEvents={[{ eventName: "ready", callback }]}
              options={{
                backgroundColor: theme.palette.mode === "dark" ? theme.palette.grey.A700 : undefined,
                timeline: {
                  showRowLabels,
                  rowLabelStyle: { color: theme.palette.text.primary },
                },
              }}
            />
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Timeline;
