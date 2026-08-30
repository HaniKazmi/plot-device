import {
  Category,
  ExpandCircleDown,
  Grade,
  History,
  LocalMovies,
  Person,
  ShowChart,
  Stars,
  Theaters,
  Timer,
  Update,
  VerifiedUser,
  Weekend,
  Whatshot,
} from "@mui/icons-material";
import { Radio, Stack, Typography } from "@mui/material";
import { capitalize } from "@mui/material/utils";
import { useState, type ReactNode } from "react";
import { StatCard, StatList, StatsListProps, TotalsBand, VitalsCard } from "../common/Stats";
import { TopListCard } from "../common/TopList";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { YearSelect } from "../common/YearSelect";
import { Section, StatBand } from "../common/SectionRail";
import { CURRENT_YEAR, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { topNWithOther } from "../common/statsData";
import { useSelectBox } from "../common/SelectBoxHook";
import { format } from "../utils/mathUtils";
import { NEUTRAL_FILL } from "../utils/types";
import { highchartsColors } from "../highcharts";
import MovieCardMediaImage from "./CardMediaImage";
import { MOVIE_SECTIONS } from "./sections";
import type { FilterDispatch } from "./filterUtils";
import {
  cinemaToColour,
  groupToColour,
  scoreBand,
  scoreBandToColour,
  scoreBands,
  type Measure,
  type Movie,
} from "./types";
import {
  allTimeTotals,
  filmsInYear,
  gapSummary,
  groupMoviesBy,
  movieTopOptions,
  perFilmAverages,
  statsCardLabelScore,
  statsCardLabelWatched,
  yearlyAverages,
  type MovieTopOption,
} from "./statsData";
import "../utils/arrayUtils";

const Stats = ({
  data,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: Movie[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Stack spacing={2}>
      <Section id={MOVIE_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearTotals
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Timer />}
            activeYearType="upto"
            stats={allTimeTotals(data)}
            renderValue={(value) => (
              <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
            )}
          />
          <YearTotals
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Update />}
            activeYearType="matching"
            minWidth={120}
            stats={filmsInYear(data, yearTo)}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
          />
          <StatSummary
            icon={<ShowChart />}
            title="Yearly Average"
            stats={yearlyAverages(data)}
          />
          <FilmAverage data={data} />
          <ReleaseToWatch data={data} />
          <Vitals
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={MOVIE_SECTIONS.top}>
        <StatBand>
          <TopCategories
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={MOVIE_SECTIONS.explore}>
        <StatBand>
          <RecentlyWatched data={data} />
          <BestRated data={data} />
          <MostWatched
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
    </Stack>
  );
};

/**
 * Score bands and cinema-vs-home — the two distinctions only this tab records, as one band each.
 * Rating is deliberately not a third: it lives on the Top band, and three bands makes the card as
 * tall as the charts it introduces.
 */
const Vitals = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const measureFunc = (movies: Movie[]) =>
    measure === "Films" ? movies.length : Math.floor(movies.sum("minutes") / 60);

  return (
    <VitalsCard>
      <TotalsBand
        title={"Score"}
        icon={<Grade />}
        data={data}
        measureFunc={measureFunc}
        group={[...scoreBands]}
        groupOf={(movie) => scoreBand(movie.score)}
        groupToColour={scoreBandToColour}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Seen in"}
        icon={<Theaters />}
        data={data}
        measureFunc={measureFunc}
        group={["Cinema", "Home"]}
        groupOf={(movie: Movie) => (movie.cinema ? "Cinema" : "Home")}
        groupToColour={cinemaToColour}
        measureLabel={measure}
      />
    </VitalsCard>
  );
};

/** The radio picks which of these two cards the year filter applies to, hence `activeYearType`. */
const YearTotals = ({
  yearType,
  yearTo,
  filterDispatch,
  icon,
  activeYearType,
  minWidth,
  stats,
  renderValue,
}: {
  yearType: YearType;
  yearTo: number;
  filterDispatch: FilterDispatch;
  icon: ReactNode;
  activeYearType: YearType;
  minWidth?: number;
  stats: Record<string, number>;
  renderValue: (value: number) => ReactNode;
}) => (
  <StatCard
    icon={icon}
    title={
      <YearSelect
        value={yearTo as YearNumber}
        onChange={(value) => filterDispatch({ type: "updateFilter", filter: "yearTo", value })}
        minWidth={minWidth}
        renderValue={renderValue}
      />
    }
    action={
      <Radio
        size="small"
        checked={yearType == activeYearType}
        onChange={() => filterDispatch({ type: "toggleYearType" })}
      />
    }
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

/** Each `statsData` total is already keyed by the label it renders under, in display order. */
const StatSummary = ({ icon, title, stats }: { icon: ReactNode; title: string; stats: Record<string, number> }) => (
  <StatCard
    icon={icon}
    title={title}
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

const FilmAverage = ({ data }: { data: Movie[] }) => {
  const { minutes, score } = perFilmAverages(data);
  return (
    <StatCard
      icon={<LocalMovies />}
      title="Film Average"
      content={[
        ["Minutes", minutes],
        ["Score", score],
      ]}
    />
  );
};

/** The movie-native card: how long a film waits between coming out and being watched. */
const ReleaseToWatch = ({ data }: { data: Movie[] }) => {
  const { medianYears, sameYearPercent } = gapSummary(data);
  return (
    <StatCard
      icon={<History />}
      title="Release → Watch"
      content={[
        ["Median Years", medianYears],
        ["Same Year %", sameYearPercent],
      ]}
    />
  );
};

const TopCategories = ({ data, measure }: { data: Movie[]; measure: Measure }) => (
  <>
    {(["genre", "director", "franchise"] as const).map((category) => (
      <TopList
        key={category}
        data={data}
        measure={measure}
        defaultCategory={category}
      />
    ))}
  </>
);

const optionIcons: Record<MovieTopOption, ReactNode> = {
  genre: <Category />,
  director: <Person />,
  franchise: <Stars />,
  rating: <VerifiedUser />,
  decade: <History />,
  cinema: <Theaters />,
  score: <Grade />,
};

const TopList = ({
  data,
  measure,
  defaultCategory,
}: {
  data: Movie[];
  measure: Measure;
  defaultCategory: MovieTopOption;
}) => {
  const [option, controls] = useSelectBox(movieTopOptions, defaultCategory);
  const colorOffset = movieTopOptions.indexOf(option) * 3;

  const most = topNWithOther(groupMoviesBy(data, option, measure));

  // Categories with no vocabulary of their own take a palette colour offset by the option's
  // index, so switching category recolours consistently; "Other" is always the neutral bucket.
  const getColour = (struct: (typeof most)[0], index: number) => {
    if (struct.name === "Other") return NEUTRAL_FILL;
    const groupCol = struct.top ? groupToColour(option, struct.top) : "";
    return groupCol || highchartsColors[(index + colorOffset) % highchartsColors.length];
  };

  const items = most.map((struct, index) => ({
    name: struct.name,
    count: struct.count,
    percent: struct.percent,
    colour: getColour(struct, index),
  }));

  return (
    <TopListCard
      title={`Top ${capitalize(option)}`}
      icon={optionIcons[option]}
      controls={controls}
      items={items}
      measureLabel={measure}
    />
  );
};

/** The tab's closest thing to a "now": what was watched most recently. */
const RecentlyWatched = ({ data }: { data: Movie[] }) => (
  <MovieStatList
    icon={<Weekend />}
    title="Recently Watched"
    content={data.sortByKey("startDate")}
    labelComponent={statsCardLabelWatched}
  />
);

/**
 * A fixed card rather than a mode of Most Watched: "what was best" and "where the time went" are
 * different questions, and a card whose title changes with a select box reads as a bug.
 */
const BestRated = ({ data }: { data: Movie[] }) => {
  const rated = data
    .filter((movie) => movie.score !== undefined)
    // Watch date breaks the tie: many films share a nine, and the recent ones say more.
    .sortByKey("startDate")
    .sortByKey("score");
  return (
    <MovieStatList
      icon={<Grade />}
      title="Best Rated"
      content={rated}
      labelComponent={statsCardLabelScore}
    />
  );
};

const MostWatched = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(movieTopOptions, "franchise");
  const most = groupMoviesBy(data, option, measure);

  const [dialogContent, setDialogContent] = useState<(typeof most)[number] | null>(null);

  const dialog = dialogContent ? (
    <DrilldownDialog
      title={dialogContent.name}
      onClose={() => setDialogContent(null)}
      // Sorted here rather than in `groupMoviesBy`, which would sort every category on every
      // render to serve the one being drilled into.
      content={dialogContent.all.sortByKey("minutes")}
      cardKey={(entry) => option + "-statslistcard-" + entry.name}
      labelComponent={statsCardLabelWatched}
      chipComponent={movieScoreChip}
      pictureWidth={movieStatListSharedProps.dialogPictureWidth}
      aspectRatio={movieStatListSharedProps.aspectRatio}
      MediaComponent={MovieCardMediaImage}
    />
  ) : null;

  return (
    <>
      <StatList
        icon={<Whatshot />}
        controls={controls}
        title="Most Watched"
        content={most}
        chipComponent={(entry) => ({
          icon: <ExpandCircleDown color="action" />,
          onClick: () => setDialogContent(entry),
        })}
        // The name and the figure stacked rather than side by side — under a poster there is no
        // width for both on one line.
        labelComponent={(item: (typeof most)[0]) => [[item.name], [`${format(item.count)} ${measure}`]]}
        MediaComponent={(props) => (
          <MovieCardMediaImage
            {...props}
            item={props.item.top}
            colour={groupToColour(option, props.item.top)}
          />
        )}
        nameComponent={(entry) => entry.name}
        {...movieStatListSharedProps}
      />
      {dialog}
    </>
  );
};

/** The corner badge: the film's score, wearing its band's fill. Unscored films carry none. */
const movieScoreChip = (movie: Movie) =>
  movie.score !== undefined
    ? { label: String(movie.score), colour: scoreBandToColour(scoreBand(movie.score)) }
    : undefined;

const movieStatListSharedProps: Pick<
  StatsListProps<Movie>,
  "aspectRatio" | "divider" | "width" | "pictureWidth" | "dialogPictureWidth"
> = {
  // Posters, not banners — the cards keep the shape the library grid shows them at.
  aspectRatio: "2/3",
  divider: true,
  width: [12, 12, 4],
  pictureWidth: [6, 4, 4],
  dialogPictureWidth: [6, 3, 2],
};

const MovieStatList = (
  props: Omit<
    StatsListProps<Movie>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof movieStatListSharedProps
  >,
) => (
  <StatList
    chipComponent={movieScoreChip}
    MediaComponent={MovieCardMediaImage}
    nameComponent={(entry) => entry.name}
    {...movieStatListSharedProps}
    {...props}
  />
);

export default Stats;
