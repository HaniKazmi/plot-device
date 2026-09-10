import { useState } from "react";
import type { KeysMatching } from "../utils/types";
import { animeLabel, groupToColour, type Measure, type Show } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { useScheme } from "../common/useScheme";

// `anime` is named beside the string keys because it is a boolean on the model, as `show` is named
// for being the parent rather than a field.
type OptionKeys = KeysMatching<Show, string | Show["startDate"]> | "show" | "anime";

const ShowSunburst = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["status", "startDate", "show"]);

  const scheme = useScheme();

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      // The shows behind the rings rather than the seasons the chart is fed, which is the unit
      // the tab's other sections count in.
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
              return animeLabel(season.show);
            default:
              return String(season.show[key as keyof Show]);
          }
        },
        // Exact hours per season, so the wheel's geometry is the sum; the figure is floored where it
        // is printed, the way every other hours figure on the tab floors its sum.
        getCount: ({ minutes, e }) => (measure === "Hours" ? minutes / 60 : measure === "Seasons" ? 1 : e),
        displayValue: measure === "Hours" ? Math.floor : undefined,
        getColor: ({ show }, firstGroup) => groupToColour(firstGroup, show, scheme) || undefined,
        getLeafName: ({ show, s }) => `${show.name} - S${s}`,
      }}
      controls={
        <SunBurstControls
          options={options}
          controlStates={controlStates}
          setControlStates={setControlStates}
          // The key names the parent record; what the ring actually groups on is its name, and
          // "Show" beside "Name" in one row reads as two rings offering the same thing.
          labels={{ show: "Show name" }}
        />
      }
    />
  );
};

const options: OptionKeys[] = [
  "name",
  "status",
  "startDate",
  "show",
  "anime",
  "genre",
  "network",
  "certificate",
  "franchise",
];

export default ShowSunburst;
