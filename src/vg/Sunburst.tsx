import { Card, CardContent, CardHeader, FormGroup } from "@mui/material";
import { useEffect, useState } from "react";
import Plot from "../plotly"
import { SelectBox } from "./SelectionComponents";
import { isVideoGame, KeysMatching, Measure, VideoGame, VideoGameTree } from "./types";

interface SunburstData {
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
}

const isStringArray = (x: any[]): x is string[] => x.every((i) => typeof i === "string");

type OptionKeys = KeysMatching<VideoGame, string | VideoGame["startDate"]>;

const Sunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [{ ids, labels, parents, values }, setSunburstData] = useState<SunburstData>({
    ids: [],
    labels: [],
    parents: [],
    values: [],
  });

  return (
    <Card>
      <CardHeader
        title="Sunburst"
        action={<SunBurstControls data={data} setSunburstData={setSunburstData} measure={measure} />}
      />
      <CardContent>
        <Plot
          style={{ width: "100%", height: "95vh" }}
          data={[
            {
              labels,
              parents,
              values,
              ids,
              type: "sunburst",
              branchvalues: "total",
              //@ts-ignore
              maxdepth: 3,
              sort: false,
            },
          ]}
          config={{ displayModeBar: false, responsive: true }}
          layout={{ margin: { l: 0, r: 0, b: 0, t: 0 } }}
        />
      </CardContent>
    </Card>
  );
};

const options: OptionKeys[] = [
  "company",
  "format",
  "franchise",
  "game",
  "platform",
  "publisher",
  "rating",
  "status",
  "startDate",
];

const SunBurstControls = ({
  data,
  setSunburstData,
  measure,
}: {
  data: VideoGame[];
  setSunburstData: (d: SunburstData) => void;
  measure: Measure;
}) => {
  const groups = [
    useState<OptionKeys>("company"),
    useState<OptionKeys>("platform"),
    useState<OptionKeys>("franchise")
  ];
  const groupVals = groups.map(([val]) => val);

  useEffect(() => {
    const sunburstData = dataToSunburstData(data, groupVals, measure);
    setSunburstData(sunburstData);
    // eslint-disable-next-line
  }, [setSunburstData, data, measure, ...groupVals]);

  return (
    <FormGroup>
      {groups.map(([val, setVal]) => (
        <SelectBox options={options} key={val} value={val} setValue={setVal} />
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
      if (measure === "Hours" && curr.hours === undefined) return false;
      return true;
    })
    .reduce((tree, game) => {
      const groupVals = groups.map((group) => keyToVal(game, group));
      if (!isStringArray(groupVals)) return tree;
      let obj = tree;
      groupVals.forEach((val) => (obj = obj[val] = (obj[val] as VideoGameTree) || {}));
      obj[game.game] = game;
      return tree;
    }, {} as VideoGameTree);

  const ids: string[] = [];
  const labels: string[] = [];
  const parents: string[] = [];
  const values: number[] = [];

  const recurseGroup = (tree: VideoGameTree, parent: string) => {
    let total = 0;
    Object.entries(tree)
      .sort(([val], [val2]) => val.localeCompare(val2))
      .forEach(([key, value]) => {
        let count: number;
        if (isVideoGame(value)) {
          count = measure === "Hours" ? value.hours! : 1;
        } else {
          count = recurseGroup(value, `${parent}-${key}`);
        }

        labels.push(key);
        parents.push(parent);
        values.push(count);
        ids.push(`${parent}-${key}`);
        total += count;
      });

    return total;
  };

  recurseGroup(grouped, "");

  return {
    labels,
    parents,
    values,
    ids,
  };
};

export default Sunburst;
