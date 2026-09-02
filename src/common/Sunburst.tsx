import { Card, CardContent, FormGroup, useTheme } from "@mui/material";
import { DonutLarge } from "@mui/icons-material";
import { useLayoutEffect, useState, type Dispatch, type ReactNode, type SetStateAction } from "react";
import type {} from "@mui/material/themeCssVarsAugmentation";
import { Chart, SunburstSeries } from "../highcharts";
import { SectionHeader } from "./SectionHeader";
import { SelectBox } from "./SelectionComponents";
import type { Colour } from "../utils/types";
import { generateSunburstData, sunburstRoot } from "./sunburstData";

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
  const groupsKey = groups.join();
  /**
   * The reader's drill, held with the grouping it was made under. A drill names a path through one
   * hierarchy, so under another grouping it reads as no drill at all: a re-nest returns the reader
   * to the top of the new tree rather than mounting a chart already rooted partway down it, which
   * draws that subtree and no trail back out of it.
   */
  const [drill, setDrill] = useState({ groups: groupsKey, id: "" });
  const drilledId = drill.groups === groupsKey ? drill.id : "";
  const [rebuilds, setRebuilds] = useState(0);

  const generatedData = generateSunburstData(data, groups, options);
  // One ring per group, plus the leaf ring of individual items.
  const leafLevel = groups.length + 1;
  /**
   * The root is stated in the options on every render rather than left to the id Highcharts writes
   * into its own options as the reader drills: the wrapper applies a data or groups change as one
   * synchronous `chart.update`, and the chart translates inside that call, so a root the new data
   * holds no node for has to be reset in the options the update carries or the translate throws.
   */
  const root = sunburstRoot(generatedData, drilledId);
  const hide = root.atTop;
  /**
   * The chart is rebuilt rather than updated whenever the hierarchy it drew is not the one it is
   * handed. `chart.update` matches incoming nodes to the points the chart already holds by
   * position, so a re-nest — which rewrites every id below the first ring — leaves the wedges drawn
   * at the previous tree's angles: a leaf lands in the innermost ring and the circle draws as a fan
   * with gaps in it. A subset of the same ids (a filter) and the same ids at new values (the
   * measure toggle) both update faithfully, so those keep the animation from one state to the next.
   */
  const chartKey = `${groupsKey}-${rebuilds}`;

  /**
   * A drilled root that a filter has emptied out of the data is dropped, and the chart rebuilt
   * around the drop. The breadcrumb trail and the drilled geometry live in the chart instance, so
   * resetting the root through the options alone leaves the reader looking at rings sized for a
   * node that is gone, under a trail that still names it. Clearing the id is the other half: a
   * drill kept past the data that held it would take effect again the moment the same ids came
   * back, on a chart the reader had watched return to the top.
   */
  useLayoutEffect(() => {
    if (root.id === drilledId) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDrill({ groups: groupsKey, id: "" });
    setRebuilds((count) => count + 1);
  }, [root.id, drilledId, groupsKey]);

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
          key={chartKey}
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
              rootId: root.id,
              name: "All",
              events: {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                setRootNode: (event: any) => {
                  setDrill({ groups: groupsKey, id: event.newRootId });
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
