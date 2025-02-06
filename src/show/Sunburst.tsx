import { useState } from "react";
import type { Colour, KeysMatching } from "../utils/types";
import { groupToColour, type Measure, type Season, type Show } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";

type OptionKeys = KeysMatching<Show, string | Show["startDate"] | Show["anime"]> | "show";

const VgSunburst = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["status", "startDate", "show"]);
  const entries = dataToSunburstData(data.flatMap(show => show.s), controlStates, measure);

  return (
    <Sunburst data={entries} controls={<SunBurstControls options={options} controlStates={controlStates} setControlStates={setControlStates} />} />
  );
};

const options: OptionKeys[] = [
  "name",
  "status",
  "startDate",
  "show",
  "anime"
];

interface ShowTree {
  [key: string]: ShowTree | Season;
}

const isShow = (arg: ShowTree | Season): arg is Season => !!arg.s;

const dataToSunburstData = (data: Season[], groups: OptionKeys[], measure: Measure) => {
  const keyToVal = (show: Season, key: OptionKeys) => {
    if (key == "startDate") {
        return show.startDate.yearString();
    }

    if (key == "show") {
        return show.show.name
    }

    return show.show[key]
  };

  const grouped = data
    .filter((show) => measure !== "Hours" || show.minutes !== undefined)
    .reduce((tree, show) => {
      const groupVals = groups.map((group) => keyToVal(show, group));
      let obj = tree;
      groupVals.forEach((val) => (obj = obj[val] = (obj[val] as ShowTree) || {}));
      obj[`${show.show.name} - S${show.s}`] = show;
      return tree;
    }, {} as ShowTree);

  const recurseGroup = (
    tree: ShowTree,
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
          if (isShow(value)) {
            const count = measure === "Hours" ? Math.floor(value.minutes! / 60) : value.e;
            const color = groupToColour(groups[0], value.show) || undefined;
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
