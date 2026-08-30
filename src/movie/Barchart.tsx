import { useSelectBox } from "../common/SelectBoxHook";
import { groupToColour, type Measure, type Movie, type MovieGroup } from "./types";
import Barchart from "../common/Barchart";
import { movieGroupValue, type MovieTopOption } from "./statsData";
import { format } from "../utils/mathUtils";

type Option = Exclude<MovieGroup, "name"> | "none";

const options: Option[] = ["none", "genre", "rating", "cinema", "decade", "score", "franchise", "director"];

/**
 * Which year a film counts under. Watched is the tab's own axis; Released redraws the same
 * library as a chart of cinema history — which no other tab can ask, since nothing else records
 * a release date decades from its start date.
 */
const axisOptions = ["Watched", "Released"] as const;

const MovieBarchart = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  // Grouped by genre from the start — the one distinction this tab is about, as company is on
  // the games tab.
  const [group, groupControls] = useSelectBox(options, "genre");
  const [axis, axisControls] = useSelectBox(axisOptions, "Watched");

  const barchartData = (cumulative: boolean) =>
    data.map((movie) => {
      const date = axis === "Watched" ? movie.startDate : movie.releaseDate;
      return {
        date: cumulative ? date.toYearMonth() : date.toYear(),
        colour: groupToColour(group, movie),
        name: group === "none" ? "" : movieGroupValue(movie, group as MovieTopOption) || movie.name,
        value: measure === "Films" ? 1 : movie.minutes,
      };
    });

  return (
    <Barchart
      // The title follows the axis select, or the chart lies about what its x-axis means.
      title={`${measure} by ${axis.toLowerCase()} year`}
      count={`${format(data.length)} films`}
      data={barchartData}
      postAggregate={measure === "Hours" ? (minutes) => Math.floor(minutes / 60) : undefined}
      controls={
        <>
          {axisControls}
          {groupControls}
        </>
      }
    />
  );
};

export default MovieBarchart;
