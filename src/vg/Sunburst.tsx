import { useState } from "react";
import { groupToColour, isVideoGame, type Measure, type VideoGame, type VideoGameTree } from "./types";
import type { KeysMatching, Colour } from "../utils/types";
import { PlainDate } from "../common/date";
import Sunburst, { SunBurstControls } from "../common/Sunburst";

type OptionKeys = KeysMatching<VideoGame, string | VideoGame["startDate"]>;
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

const VgSunburst = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["company", "platform", "franchise"]);
  const entries = dataToSunburstData(data, controlStates, measure);

  return (
    <Sunburst
      data={entries}
      controls={
        <SunBurstControls
          options={options}
          controlStates={controlStates}
          setControlStates={setControlStates}
        />
      }
    />
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

  const recurseGroup = (
    tree: VideoGameTree,
    parent: string,
    initalEntries: {
      id: string;
      name: string;
      parent: string;
      value: number;
      color: Colour | undefined;
    }[],
  ): {
    total: number;
    color: Colour | undefined;
    entries: typeof initalEntries;
  } => {
    return Object.entries(tree)
      .sort(([val], [val2]) => val.localeCompare(val2))
      .reduce(
        (acc, [key, value]) => {
          if (isVideoGame(value)) {
            const count = measure === "Hours" ? value.hours! : 1;
            const color = groupToColour(groups[0], value) || undefined;
            acc.total += count;
            acc.color = color;
            acc.entries.push({
              name: key,
              parent,
              value: count,
              id: `${parent}-${key}`,
              color,
            });
          } else {
            const { total, color } = recurseGroup(value, `${parent}-${key}`, acc.entries);
            acc.total += total;
            acc.color = color;
            acc.entries.push({
              name: key,
              parent: parent,
              value: total,
              id: `${parent}-${key}`,
              color: color,
            });
          }

          return acc;
        },
        {
          total: 0,
          color: undefined as Colour | undefined,
          entries: initalEntries,
        },
      );
  };

  const { entries } = recurseGroup(grouped, "", []);
  return entries;
};

export default VgSunburst;
