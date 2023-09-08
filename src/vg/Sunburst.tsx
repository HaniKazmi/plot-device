import { Card, CardContent, CardHeader, FormGroup, useTheme } from "@mui/material";
import { Dispatch, SetStateAction, useMemo, useState } from "react";
import Plot from "../plotly";
import { SelectBox } from "./SelectionComponents";
import { companyToColor, isVideoGame, Measure, VideoGame, VideoGameTree } from "./types";
import { KeysMatching } from "../utils/types";

interface SunburstData {
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
  colours: string[];
}

const isStringArray = (x: unknown[]): x is string[] => x.every((i) => typeof i === "string");

type OptionKeys = KeysMatching<VideoGame, string | VideoGame["startDate"]>;

const Sunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const theme = useTheme();
  const controlStates: [OptionKeys, Dispatch<SetStateAction<OptionKeys>>][] = [
    useState<OptionKeys>("company"),
    useState<OptionKeys>("platform"),
    useState<OptionKeys>("franchise"),
  ];
  const { ids, labels, parents, values, colours }: SunburstData = useMemo(
    () =>
      dataToSunburstData(
        data,
        controlStates.map(([s]) => s),
        measure,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [data, measure, ...controlStates],
  );

  return (
    <Card>
      <CardHeader title="Sunburst" action={<SunBurstControls controlStates={controlStates} />} />
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh", maxHeight: "100vw" }}
          data={[
            {
              labels,
              parents,
              values,
              ids,
              type: "sunburst",
              branchvalues: "total",
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              //@ts-ignore
              maxdepth: 3,
              sort: false,
              marker: { line: { color: theme.palette.background.paper }, colors: colours },
            },
          ]}
          config={{ displayModeBar: false, responsive: true }}
          layout={{
            margin: { l: 0, r: 0, b: 0, t: 0 },
            paper_bgcolor: theme.palette.mode === "dark" ? "rgba(0,0,0,0)" : undefined,
          }}
        />
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
}: {
  controlStates: [OptionKeys, Dispatch<SetStateAction<OptionKeys>>][];
}) => {
  return (
    <FormGroup>
      {controlStates.map(([val, setVal], index) => (
        <SelectBox options={options} key={"sunburst-control-" + index} value={val} setValue={setVal} />
      ))}
    </FormGroup>
  );
};

const dataToSunburstData = (data: VideoGame[], groups: OptionKeys[], measure: Measure) => {
  const keyToVal = (game: VideoGame, key: OptionKeys) => {
    const val = game[key];
    if (val instanceof Date) {
      return val.getFullYear().toString();
    }
    return val;
  };

  const grouped = data
    .filter((curr) => {
      return !(measure === "Hours" && curr.hours === undefined);
    })
    .reduce((tree, game) => {
      const groupVals = groups.map((group) => keyToVal(game, group));
      if (!isStringArray(groupVals)) return tree;
      let obj = tree;
      groupVals.forEach((val) => (obj = obj[val] = (obj[val] as VideoGameTree) || {}));
      obj[game.name] = game;
      return tree;
    }, {} as VideoGameTree);

  const ids: string[] = [];
  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];
  const colours: string[] = [];

  const recurseGroup = (tree: VideoGameTree, parent: string): [number, string] => {
    let total = 0;
    let colour = "";
    Object.entries(tree)
      .sort(([val], [val2]) => val.localeCompare(val2))
      .forEach(([key, value]) => {
        let count: number;
        if (isVideoGame(value)) {
          count = measure === "Hours" ? value.hours! : 1;
          if (groups[0] === "company") {
            colour = companyToColor(value);
          }
        } else {
          [count, colour] = recurseGroup(value, `${parent}-${key}`);
        }

        labels.push(key);
        parents.push(parent);
        values.push(count);
        ids.push(`${parent}-${key}`);
        colours.push(colour);
        total += count;
      });

    return [total, colour];
  };

  recurseGroup(grouped, "");

  return {
    labels,
    parents,
    values,
    ids,
    colours,
  };
};

export default Sunburst;
