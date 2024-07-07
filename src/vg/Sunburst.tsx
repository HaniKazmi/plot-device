import { Card, CardContent, CardHeader, FormGroup, useTheme } from "@mui/material";
import { type Dispatch, type SetStateAction, useState } from "react";
import { SelectBox } from "../common/SelectionComponents";
import { groupToColour, isVideoGame, type Measure, type VideoGame, type VideoGameTree } from "./types";
import type { KeysMatching, Colour } from "../utils/types";
import { PlainDate } from "../common/date";
import { HighchartsWrapper, type Options } from "../Highcharts";

type OptionKeys = KeysMatching<VideoGame, string | VideoGame["startDate"]>;

const Sunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const theme = useTheme();
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["company", "platform", "franchise"]);
  const [hide, setHide] = useState(true);
  const entries = dataToSunburstData(data, controlStates, measure)

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
        data: entries
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
        action={<SunBurstControls controlStates={controlStates} setControlStates={setControlStates} />}
      />
      <CardContent>
        <HighchartsWrapper containerProps={{ style: { height: "100vh" } }} options={options} />
      </CardContent>
    </Card>
  );
};

const options: OptionKeys[] = [
  "company",
  "format",
  "franchise",
  "name",
  "platform",
  "publisher",
  "genre",
  "rating",
  "status",
  "startDate",
];

const SunBurstControls = ({
  controlStates,
  setControlStates,
}: {
  controlStates: OptionKeys[];
  setControlStates: Dispatch<SetStateAction<OptionKeys[]>>;
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

const dataToSunburstData = (data: VideoGame[], groups: OptionKeys[], measure: Measure) => {
  const keyToVal = (game: VideoGame, key: OptionKeys) => {
    const val = game[key];
    return val instanceof PlainDate ? val.yearString() : val;
  };

  const grouped = data
    .filter((game) => measure !== "Hours" || game.hours !== undefined)
    .reduce((tree, game) => {
      const groupVals = groups.map((group) => keyToVal(game, group));
      let obj = tree;
      groupVals.forEach((val) => (obj = obj[val] = (obj[val] as VideoGameTree) || {}));
      obj[game.name] = game;
      return tree;
    }, {} as VideoGameTree);

  const recurseGroup = (tree: VideoGameTree, parent: string, initalEntries: {
    id: string,
    name: string,
    parent: string,
    value: number,
    color: Colour | undefined
  }[]): {
    total: number, color: Colour | undefined, entries: typeof initalEntries
  } => {
    return Object.entries(tree)
      .sort(([val], [val2]) => val.localeCompare(val2))
      .reduce((acc, [key, value]) => {
        if (isVideoGame(value)) {
          const count = measure === "Hours" ? value.hours! : 1;
          const color = groupToColour(groups[0], value) || undefined;
          acc.total += count
          acc.color = color
          acc.entries.push({
            name: key,
            parent,
            value: count,
            id: `${parent}-${key}`,
            color
          })

        } else {
          const { total, color } = recurseGroup(value, `${parent}-${key}`, acc.entries);
          acc.total += total;
          acc.color = color
          acc.entries.push({
            name: key,
            parent: parent,
            value: total,
            id: `${parent}-${key}`,
            color: color
          })
        }

        return acc;
      }, {
        total: 0, color: undefined as Colour | undefined, entries: initalEntries
      });
  };

  const { entries } = recurseGroup(grouped, "", []);
  return entries;
};

export default Sunburst;
