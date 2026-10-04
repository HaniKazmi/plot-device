import { useState } from "react";
import { SegmentedControl, type SegmentOption } from "../common/SelectionComponents";
import { useColourBy } from "../common/useColourBy";
import { TimelineSection } from "../common/TimelineSection";
import { groupMarks, type PicturePress, type TimelineData } from "../common/timelineLayout";
import { stated } from "../common/population";
import type { YearNumber } from "../common/date";
import { pictureAtHeight } from "../common/cardArrangement";
import type { YearType } from "../common/filterReducer";
import { groupToColour, type Movie } from "./types";
import MovieCardMediaImage, { MovieHoverCard } from "./CardMediaImage";
import { movieGroupValue, movieItemKey } from "./statsData";
import { pageState } from "./filterUtils";

/**
 * What the timeline can be coloured by: every key the tab's own `groupToColour` answers, genre
 * first, as the library's border draws a film.
 */
const COLOUR_KEYS = ["genre", "certificate", "cinema", "style", "decade", "score", "franchise"] as const;

/** What one mark stands for: a film, or a franchise with its films combined into a span. */
type Mark = "film" | "franchise";

const MARKS: readonly SegmentOption<Mark>[] = [
  { value: "film", label: "Films" },
  { value: "franchise", label: "Franchises" },
];

const pictureOf = (movie: Movie) => (height: number, press: PicturePress) => (
  <MovieCardMediaImage
    item={movie}
    landscape
    lazy
    sx={pictureAtHeight("banner", height)}
    {...press}
  />
);

/**
 * Every film as a mark on the day it was watched: a point, finished the day it is started, which
 * Stacked draws as a tick on its year's row and Across as a mark on its day. A franchise is
 * a span from its first watch to its last, which is the one shape a film library draws as a bar.
 */
const MovieTimeline = ({ data, yearType, yearTo }: { data: Movie[]; yearType: YearType; yearTo: YearNumber }) => {
  const colour = useColourBy(
    COLOUR_KEYS,
    "genre",
    (movie: Movie, key, scheme) => groupToColour(key, movie, scheme),
    (movie, key) => movieGroupValue(movie, key),
  );
  const [mark, setMark] = useState<Mark>("film");

  const markOf = (movie: Movie): TimelineData => ({
    key: movieItemKey(movie),
    name: movie.name,
    tooltip: () => <MovieHoverCard item={movie} />,
    colour: colour.fill(movie),
    start: movie.startDate,
    end: movie.startDate,
    picture: pictureOf(movie),
  });
  // The franchise column and not the series one, which the sheet leaves blank on every film. A film
  // standing alone names itself there and stays a mark of its own; a franchise opens where its
  // first film was watched, wears that film's colour and opens the card of the one watched last.
  const franchises = mark === "franchise" ? groupMarks(data, markOf, (movie) => movie.franchise) : undefined;
  const marks = franchises ? franchises.map(({ mark }) => mark) : data.map(markOf);

  return (
    <TimelineSection
      title={mark === "film" ? "Every film" : "Every franchise"}
      // A mark per franchise is a population nothing else on the tab counts; a mark per film is the
      // page's own, already on the rail's chip.
      count={franchises ? stated(marks.length, "franchises") : undefined}
      data={marks}
      controls={
        <>
          <SegmentedControl
            options={MARKS}
            value={mark}
            onChange={setMark}
            ariaLabel="One mark per"
          />
        </>
      }
      // The films whose colours the marks wear, which is what the key names.
      colourKey={colour.colourKey(franchises ? franchises.map(({ lead }) => lead) : data)}
      yearType={yearType}
      yearTo={yearTo}
      dispatch={pageState.dispatch}
      shape="banner"
    />
  );
};

export default MovieTimeline;
