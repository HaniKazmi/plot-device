import { Card, CardContent, CardHeader, FormGroup, useTheme } from "@mui/material";
import { useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Chart, SunburstSeries } from "../highcharts";
import { SelectBox } from "./SelectionComponents";
import type { Colour } from "../utils/types";

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
  data,
  controls,
  groups,
  options,
}: {
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
      <CardHeader
        title="Sunburst"
        action={controls}
      />
      <CardContent>
        <Chart
          containerProps={{ style: { height: "100vh" } }}
          options={{
            chart: {
              backgroundColor: "transparent",
              style: {
                color: theme.palette.text.primary,
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

/** Hoisted: localeCompare rebuilds a collator per call, and this sorts thousands of nodes. */
const collator = new Intl.Collator();

type SunburstEntry = {
  id: string;
  name: string;
  parent: string;
  value: number;
  color: Colour | undefined;
};

const generateSunburstData = <T, K extends string>(
  data: T[],
  groups: K[],
  options: {
    keyToVal: (item: T, key: K) => string;
    getCount: (item: T) => number | undefined;
    getColor: (item: T, firstGroup: K) => Colour | undefined;
    getLeafName: (item: T) => string;
  },
): SunburstEntry[] => {
  const entryMap = new Map<string, SunburstEntry>();

  for (const item of data) {
    const count = options.getCount(item);
    if (count === undefined) continue;

    const color = options.getColor(item, groups[0]);

    const addNode = (name: string, parent: string) => {
      const id = `${parent}-${name}`;
      let entry = entryMap.get(id);
      if (!entry) entryMap.set(id, (entry = { id, name, parent, value: 0, color }));
      entry.value += count;
      return id;
    };

    let parent = "";
    for (const group of groups) {
      parent = addNode(options.keyToVal(item, group), parent);
    }
    addNode(options.getLeafName(item), parent);
  }

  return Array.from(entryMap.values()).sort((a, b) => collator.compare(a.id, b.id));
};

export default Sunburst;
