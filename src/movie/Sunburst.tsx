import { useState } from "react";
import { groupToColour, type Measure, type Movie, type MovieGroup } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { movieGroupValue } from "./statsData";
import { useScheme } from "../common/useScheme";

type OptionKeys = Exclude<MovieGroup, "none"> | "startDate" | "name";

/**
 * Decade → genre → franchise: when it was made, what it is, what series — the hierarchy this
 * library's questions actually nest in. Director stays in the options but never leads: four
 * hundred names make an unreadable inner ring, and read fine one ring out from the leaves.
 */
const MovieSunburst = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const scheme = useScheme();

  const [controlStates, setControlStates] = useState<OptionKeys[]>(["decade", "genre", "franchise"]);

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      data={data}
      groups={controlStates}
      options={{
        keyToVal: (movie, key) => {
          switch (key) {
            case "startDate":
              return movie.startDate.yearString();
            case "name":
              return movie.name;
            default:
              // The derived keys — decade, cinema, anime, score — share one definition with the Top
              // band and the drill-down, so a film cannot land in different buckets per chart.
              return movieGroupValue(movie, key) || movie.name;
          }
        },
        // Exact hours per film, so the wheel's geometry is the sum; the figure is floored where it
        // is printed, as the barchart and the vitals band floor their sums.
        getCount: ({ minutes }) => (measure === "Hours" ? minutes / 60 : 1),
        displayValue: measure === "Hours" ? Math.floor : undefined,
        getColor: (movie, firstGroup) =>
          firstGroup === "startDate" ? undefined : groupToColour(firstGroup, movie, scheme) || undefined,
        getLeafName: (movie) => movie.name,
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

const options: OptionKeys[] = [
  "decade",
  "genre",
  "franchise",
  "certificate",
  "cinema",
  "anime",
  "score",
  "director",
  "startDate",
  "name",
];

export default MovieSunburst;
