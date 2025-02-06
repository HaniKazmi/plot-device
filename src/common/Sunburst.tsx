import { Card, CardContent, CardHeader, FormGroup, useTheme } from "@mui/material";
import type { Colour } from "../utils/types";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { HighchartsWrapper, type Options } from "../Highcharts";
import { SelectBox } from "./SelectionComponents";

const Sunburst = ({ data, controls }: { controls: ReactNode, data: {
  id: string;
  name: string;
  parent: string;
  value: number;
  color: Colour | undefined;
}[] }) => {
  const theme = useTheme();
  const [hide, setHide] = useState(true);

  const options: Options = {
    series: [
      {
        type: "sunburst",
        allowTraversingTree: true,
        name: "All",
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setRootNode: (event: any) => {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
            setHide(event.series.nodeMap[event.newRootId].level <= 1);
          },
        },

        levels: [
          {
            level: 1,
            colorByPoint: true,
          },
          {
            level: 4,
            dataLabels: {
              enabled: !hide,
            },
            levelSize: {
              value: hide ? 0 : 1,
            },
          },
        ],
        data,
      },
    ],
    chart: {
      backgroundColor: theme.palette.mode === "dark" ? "rgba(0,0,0,0)" : undefined,
      style: {
        color: theme.palette.text.primary,
      },
      events: {
        render: function () {
          this.series[0].points.forEach((point) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
            if ((point as any).node.level === 4 && point.graphic) {
              point.graphic.css({
                opacity: 0.5,
              });
            }
          });
        },
      },
    },
  };

  return (
    <Card>
      <CardHeader
        title="Sunburst"
        action={controls}
      />
      <CardContent>
        <HighchartsWrapper containerProps={{ style: { height: "100vh" } }} options={options} />
      </CardContent>
    </Card>
  );
};

export const SunBurstControls = <T extends string,>({
  controlStates,
  setControlStates,
  options
}: {
  controlStates: T[];
  setControlStates: Dispatch<SetStateAction<T[]>>;
  options: T[];
}) => {
  return (
    <FormGroup>
      {controlStates.map((val, index) => (
        <SelectBox
          options={options}
          key={"sunburst-control-" + index}
          value={val}
          setValue={(key) => setControlStates(controlStates.with(index, key))}
        />
      ))}
    </FormGroup>
  );
};

export default Sunburst;
