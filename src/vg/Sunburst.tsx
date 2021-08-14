import { useEffect, useMemo, useState } from "react";
import Plot from "react-plotly.js";
import { CheckBox } from "./CheckBox";
import { isVideoGame, VideoGame, VideoGameKeys, VideoGameTree } from "./Types";

interface SunburstData {
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
}

type SunBurstValue = "Hours" | "Count";

const Sunburst = ({ data }: { data: VideoGame[] }) => {
  const [{ ids, labels, parents, values }, setSunburstData] = useState<SunburstData>({
    ids: [],
    labels: [],
    parents: [],
    values: []
  });

  return (
    <div>
      <SunBurstControls data={data} setSunburstData={setSunburstData} />
      <Plot
        style={{ width: "100vw", height: "95vh" }}
        data={[
          {
            labels, parents, values, ids,
            type: "sunburst",
            branchvalues: "total",
            //@ts-ignore
            maxdepth: 3,
            sort: false
          }
        ]}
        config={{ displayModeBar: false, responsive: true }}
        layout={{ margin: { l: 0, r: 0, b: 0, t: 0 } }}
      />
    </div>
  );
};

const SunBurstControls = ({ data, setSunburstData }:
                            { data: VideoGame[], setSunburstData: (d: SunburstData) => void }) => {
  const [group1, setGroup1] = useState<VideoGameKeys>("company");
  const [group2, setGroup2] = useState<VideoGameKeys>("platform");
  const [group3, setGroup3] = useState<VideoGameKeys>("franchise");

  const [valueProp, setValueProp] = useState<SunBurstValue>("Count");
  const [filterPokemon, setFilterPokemon] = useState(false);
  const [filterUnconfirmed, setFilterUnconfirmed] = useState(false);

  const sunburstData = useMemo(() => dataToSunburstData(data, [group1, group2, group3], valueProp, filterUnconfirmed, filterPokemon),
    [data, group1, group2, group3, valueProp, filterUnconfirmed, filterPokemon]);

  useEffect(() => setSunburstData(sunburstData), [sunburstData, setSunburstData]);

  const options: VideoGameKeys[] = [
    "company",
    "format",
    "franchise",
    "game",
    "platform",
    "publisher",
    "rating",
    "status",
    "startDate"
  ];

  const SelectBox = ({ value, setValue }: { value: VideoGameKeys, setValue: (func: VideoGameKeys) => void }) => (
    <select value={value} onChange={(event) => setValue(event.target.value as VideoGameKeys)}>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );

  return (
    <div>
      <SelectBox value={group1} setValue={setGroup1} />
      <SelectBox value={group2} setValue={setGroup2} />
      <SelectBox value={group3} setValue={setGroup3} />
      <br />
      <CheckBox label="Filter Pokemon" value={filterPokemon} setValue={setFilterPokemon} />
      <CheckBox label="Filter Unconfirmed" value={filterUnconfirmed} setValue={setFilterUnconfirmed} />

      <div>
        <input
          type="radio"
          value="Count"
          name="count"
          defaultChecked={true}
          onChange={(event) => setValueProp(event.currentTarget.value as any)}
        />
        Count
        <input
          type="radio"
          value="Hours"
          name="count"
          onChange={(event) => setValueProp(event.currentTarget.value as any)}
        />
        Hours
      </div>
    </div>
  );
};

const dataToSunburstData = (data: VideoGame[], groups: (VideoGameKeys)[],
                            countProp: SunBurstValue, filterUnconfirmed: boolean, filterPokemon: boolean) => {
  const keyToVal = (game: VideoGame, key: VideoGameKeys) => {
    const val = game[key];
    if (key === "startDate" && val) {
      return (val as Date).getFullYear().toString();
    }
    return val as string;
  };

  const grouped = data
    .filter(curr => {
      if (countProp === "Hours" && curr.hours === undefined) return false;
      if (filterPokemon && curr.franchise === "Pokémon") return false;

      if (filterUnconfirmed) {
        if (curr.platform === "PC") {
          if (!curr.startDate?.getFullYear() || curr.startDate?.getFullYear() < 2015) return false;
        } else if (
          curr.platform !== "Nintendo Switch" &&
          curr.platform !== "Nintendo 3DS" &&
          curr.platform !== "PlayStation 4" &&
          curr.platform !== "PlayStation 5"
        ) return false;
      }

      return true;
    })
    .reduce((tree, game) => {
      const groupVals = groups.map(group => keyToVal(game, group));
      if ((groupVals as any[]).includes(undefined)) return tree;
      let obj = tree;
      groupVals.forEach(val => obj = obj[val] = obj[val] as VideoGameTree || {});
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
          count = countProp === "Hours" ? parseInt(value.hours!) : 1;
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
    labels, parents, values, ids
  };
};

export default Sunburst;
