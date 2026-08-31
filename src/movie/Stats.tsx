import {
  Category,
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
import { Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
import { StatCard, StatList, StatsListProps, StatSummary, TotalsBand, VitalsCard, YearTotals } from "../common/Stats";
import { TopListCard } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import { Hero } from "../common/Hero";
import { Section, StatBand } from "../common/SectionRail";
import { CURRENT_YEAR, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { useSelectBox } from "../common/SelectBoxHook";
import { useFranchiseMovies } from "./franchiseContext";
import { format } from "../utils/mathUtils";
import { genreToColour } from "../utils/types";
import MovieCardMediaImage from "./CardMediaImage";
import { MOVIE_SECTIONS } from "./sections";
import type { FilterDispatch } from "./filterUtils";
import {
  cinemaLabel,
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
  latestWatched,
  measureOf,
  MOVIE_EPOCH,
  movieHeroStats,
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
  const latest = latestWatched(data);

  return (
    <Stack spacing={2}>
      {/* The page's "now": every film has a watch date, so the most recent one is well defined
          and there is no tie-break to invent. Rendered only when anything survives the filters,
          which is the same test the rail's "Latest" chip is built from. */}
      {latest && (
        <Section id={MOVIE_SECTIONS.latest}>
          <MovieHero movie={latest} />
        </Section>
      )}
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
            earliestYear={MOVIE_EPOCH.year}
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
            earliestYear={MOVIE_EPOCH.year}
            stats={filmsInYear(data, yearTo)}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
          />
          <StatSummary
            icon={<ShowChart />}
            title="Yearly Average"
            stats={yearlyAverages(data)}
          />
          <FilmAverage data={data} />
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
 * The franchise count comes from the index the tab already built for the card strips, so the
 * hero and the strip inside the card it opens cannot disagree about how many films a series
 * holds.
 */
const MovieHero = ({ movie }: { movie: Movie }) => {
  const franchise = useFranchiseMovies(movie);

  return (
    <Hero
      item={movie}
      MediaComponent={MovieCardMediaImage}
      kicker={`Latest watch · ${formatDate(movie.startDate)} · ${cinemaLabel(movie)}`}
      // The same badge the strips' posters carry, so being promoted does not cost the film its score.
      chip={movieScoreChip(movie)}
      title={movie.name}
      // The genre wears the same swatch its ledger row and every genre wedge on the tab wear.
      subtitle={[{ text: movie.director }, { text: movie.genre, swatch: genreToColour(movie.genre) }]}
      stats={movieHeroStats(movie, franchise.length)}
    />
  );
};

/**
 * Score bands and cinema-vs-home — the two distinctions only this tab records, as one band each.
 * Rating is deliberately not a third: it lives on the Top band, and three bands makes the card as
 * tall as the charts it introduces.
 */
const Vitals = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const measureFunc = (movies: Movie[]) => measureOf(movies, measure);

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

const TopCategories = ({ data, measure }: { data: Movie[]; measure: Measure }) => (
  <>
    {(["genre", "director", "franchise"] as const).map((category) => (
      <TopListCard
        key={category}
        options={movieTopOptions}
        defaultOption={category}
        icons={optionIcons}
        groups={(option) => groupMoviesBy(data, option, measure)}
        colourOf={(option, top: Movie) => groupToColour(option, top)}
        measureLabel={measure}
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

/**
 * The full list, the hero's film included: the hero is a spotlight on this strip, not a removal
 * from it, so the strip stays the one complete answer to "what was watched lately".
 */
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
    // A numeric sort rather than `sortByKey`, which puts falsy values first in both directions —
    // a film honestly scored 0 would head a list titled "Best Rated".
    .toSorted((a, b) => b.score! - a.score!);
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
  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Watched"
      option={option}
      groups={groupMoviesBy(data, option, measure)}
      // The name and the figure stacked rather than side by side — under a poster there is no
      // width for both on one line.
      labelComponent={(group) => [[group.name], [`${format(group.count)} ${measure}`]]}
      colourOf={(top) => groupToColour(option, top)}
      MediaComponent={MovieCardMediaImage}
      dialogSort={(movies) => movies.sortByKey("minutes")}
      nameOf={(movie) => movie.name}
      dialogLabelComponent={statsCardLabelWatched}
      dialogChipComponent={movieScoreChip}
      {...movieStatListSharedProps}
    />
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
