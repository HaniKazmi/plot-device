import { useState } from "react";
import type { KeysMatching } from "../utils/types";
import { groupToColour, type Measure, type Show } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";

type OptionKeys = KeysMatching<Show, string | Show["startDate"] | Show["anime"]> | "show";

const ShowSunburst = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["status", "startDate", "show"]);

  return (
    <Sunburst
      data={data.flatMap((show) => show.s)}
      groups={controlStates}
      options={{
        keyToVal: (season, key) => {
          switch (key) {
            case "startDate":
              return season.startDate.yearString();
            case "show":
              return season.show.name;
            case "anime":
              return season.show.anime ? "Anime" : "Western";
            default:
              return String(season.show[key as keyof Show]);
          }
        },
        getCount: ({ minutes, e }) => (measure === "Hours" ? minutes && Math.floor(minutes / 60) : e),
        getColor: ({ show }, firstGroup) => groupToColour(firstGroup, show) || undefined,
        getLeafName: ({ show, s }) => `${show.name} - S${s}`,
      }}
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

const options: OptionKeys[] = ["name", "status", "startDate", "show", "anime"];

export default ShowSunburst;
