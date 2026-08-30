import { useState } from "react";
import { groupToColour, type Measure, type Movie, type MovieGroup } from "./types";
import Sunburst, { SunBurstControls } from "../common/Sunburst";
import { movieGroupValue, type MovieTopOption } from "./statsData";
import { format } from "../utils/mathUtils";

type OptionKeys = Exclude<MovieGroup, "none"> | "startDate" | "name";

/**
 * Decade → genre → franchise: when it was made, what it is, what series — the hierarchy this
 * library's questions actually nest in. Director stays in the options but never leads: four
 * hundred names make an unreadable inner ring, and read fine one ring out from the leaves.
 */
const MovieSunburst = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const [controlStates, setControlStates] = useState<OptionKeys[]>(["decade", "genre", "franchise"]);

  return (
    <Sunburst
      title={`Where the ${measure.toLowerCase()} went`}
      count={`${format(data.length)} films`}
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
              // The derived keys — decade, cinema, score — share one definition with the Top
              // band and the drill-down, so a film cannot land in different buckets per chart.
              return movieGroupValue(movie, key as MovieTopOption) || movie.name;
          }
        },
        // Floored per film rather than post-aggregated because the shell has no `postAggregate`;
        // the shows tab counts the same way, and one convention beats two.
        getCount: ({ minutes }) => (measure === "Hours" ? minutes && Math.floor(minutes / 60) : 1),
        getColor: (movie, firstGroup) => groupToColour(firstGroup as MovieGroup, movie) || undefined,
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
  "rating",
  "cinema",
  "score",
  "director",
  "startDate",
  "name",
];

export default MovieSunburst;
