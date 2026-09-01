import { Card, CardContent, FormGroup, useTheme } from "@mui/material";
import { DonutLarge } from "@mui/icons-material";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { Chart, SunburstSeries } from "../highcharts";
import { SectionHeader } from "./SectionHeader";
import { SelectBox } from "./SelectionComponents";
import type { Colour } from "../utils/types";
import { generateSunburstData } from "./sunburstData";

/**
 * Fades the outermost ring so leaf items read as detail rather than structure.
 * Lives outside the component because the React Compiler cannot compile a function
 * containing `this`, and Highcharts binds the chart to `this` on its render event.
 */
const dimLeafRing = (leafLevel: number) =>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function (this: any) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.series[0].points.forEach((point: any) => {
      if (point.node.level === leafLevel && point.graphic) {
        point.graphic.css({ opacity: 0.5 });
      }
    });
  };

const Sunburst = <T, K extends string>({
  title,
  count,
  data,
  controls,
  groups,
  options,
}: {
  /** What the chart is of, in the caller's own words — a shell cannot know it counts games. */
  title: string;
  count?: string;
  controls: ReactNode;
  data: T[];
  groups: K[];
  options: {
    keyToVal: (item: T, key: K) => string;
    getCount: (item: T) => number | undefined;
    getColor: (item: T, firstGroup: K) => Colour | undefined;
    getLeafName: (item: T) => string;
  };
}) => {
  const theme = useTheme();
  const [hide, setHide] = useState(true);

  const generatedData = generateSunburstData(data, groups, options);
  // One ring per group, plus the leaf ring of individual items.
  const leafLevel = groups.length + 1;

  return (
    <Card>
      <SectionHeader
        icon={<DonutLarge />}
        title={title}
        count={count}
        action={controls}
      />
      <CardContent>
        <Chart
          /**
           * The chart shares a row with the barchart at half width each, so the two are read
           * against one another and a column of empty ground under one of them is the thing that
           * breaks the row. A sunburst is a circle: its diameter is capped by the width of a
           * half-width column, so past that point extra height buys nothing and the ceiling is a
           * fixed figure rather than a fraction. Below it the viewport still governs, and never
           * past the `80vh` the barchart beside it takes.
           */
          containerProps={{ style: { height: "min(80vh, 700px)" } }}
          options={{
            chart: {
              backgroundColor: "transparent",
              style: {
                color: theme.vars.palette.text.primary,
              },
              events: {
                render: dimLeafRing(leafLevel),
              },
            },
          }}
        >
          <SunburstSeries
            data={generatedData}
            options={{
              allowTraversingTree: true,
              name: "All",
              events: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setRootNode: (event: any) => {
                  setHide(event.series.nodeMap[event.newRootId].level <= 1);
                },
              },
              levels: [
                {
                  level: 1,
                  colorByPoint: true,
                },
                {
                  level: leafLevel,
                  dataLabels: {
                    enabled: !hide,
                  },
                  levelSize: {
                    value: hide ? 0 : 1,
                  },
                },
              ],
            }}
          />
        </Chart>
      </CardContent>
    </Card>
  );
};

export const SunBurstControls = <T extends string>({
  controlStates,
  setControlStates,
  options,
}: {
  controlStates: T[];
  setControlStates: Dispatch<SetStateAction<T[]>>;
  options: readonly T[];
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
