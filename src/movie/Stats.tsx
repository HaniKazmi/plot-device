import {
  Category,
  Grade,
  History,
  LocalMovies,
  Person,
  ShowChart,
  Stars,
  Theaters,
  VerifiedUser,
  Whatshot,
} from "@mui/icons-material";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import {
  StatCard,
  StatList,
  type GridListLayout,
  type StatListBaseProps,
  StatSummary,
  TotalsBand,
  VitalsCard,
  YearVitalsPair,
} from "../common/Stats";
import { TopCategoryBand } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import { Hero } from "../common/Hero";
import { Section, StatBand } from "../common/SectionRail";
import { formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { useSelectBox } from "../common/SelectBoxHook";
import { useFranchiseMovies } from "./franchiseContext";
import { format } from "../utils/mathUtils";
import type { Scheme } from "../utils/types";
import { movieHeroRows, movieSubtitle } from "./cardData";
import MovieCardMediaImage, { MovieFranchiseStrip } from "./CardMediaImage";
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
  movieKey,
  statsCardLabelWatched,
  yearlyAverages,
  type MovieTopOption,
} from "./statsData";
import "../utils/arrayUtils";
import { useScheme } from "../common/useScheme";

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
          which is the same test the rail's "Now" chip is built from. */}
      {latest && (
        <Section id={MOVIE_SECTIONS.latest}>
          <MovieHero movie={latest} />
        </Section>
      )}
      <Section id={MOVIE_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            earliestYear={MOVIE_EPOCH.year}
            allTime={allTimeTotals(data)}
            inYear={filmsInYear(data, yearTo)}
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
  const scheme = useScheme();

  const franchise = useFranchiseMovies(movie);

  return (
    <Hero
      item={movie}
      MediaComponent={MovieCardMediaImage}
      kicker={`Latest watch · ${formatDate(movie.startDate)} · ${cinemaLabel(movie)}`}
      title={movie.name}
      // The genre wears the same swatch its ledger row and every genre wedge on the tab wear.
      subtitle={movieSubtitle(movie, scheme)}
      stats={movieHeroStats(movie, franchise.length)}
      strip={
        <MovieFranchiseStrip
          movie={movie}
          mode="order"
        />
      }
      rows={movieHeroRows(movie, scheme)}
    />
  );
};

/**
 * Score bands and cinema-vs-home — the two distinctions only this tab records, as one band each.
 * Rating is deliberately not a third: it lives on the Top band, and three bands makes the card as
 * tall as the charts it introduces.
 */
const Vitals = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const scheme = useScheme();

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
        groupToColour={(ele) => scoreBandToColour(ele, scheme)}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Seen in"}
        icon={<Theaters />}
        data={data}
        measureFunc={measureFunc}
        group={["Cinema", "Home"]}
        groupOf={(movie: Movie) => (movie.cinema ? "Cinema" : "Home")}
        groupToColour={(ele) => cinemaToColour(ele, scheme)}
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

const TopCategories = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const scheme = useScheme();

  return (
    <TopCategoryBand
      defaults={["genre", "director", "franchise"]}
      options={movieTopOptions}
      icons={optionIcons}
      groups={(option) => groupMoviesBy(data, option, measure)}
      colourOf={(option, top: Movie) => groupToColour(option, top, scheme)}
      measureLabel={measure}
    />
  );
};

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
    icon={<History />}
    title="Recently Watched"
    content={data.sortByKey("startDate")}
    labelComponent={statsCardLabelWatched}
  />
);

const movieMostWatchedOptions = ["name", ...movieTopOptions] as const;

const MostWatched = ({ data, measure }: { data: Movie[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(movieMostWatchedOptions, "franchise");

  if (option === "name") {
    return (
      <MostWatchedFilms
        data={data}
        controls={controls}
      />
    );
  }
  return (
    <MostWatchedCategory
      data={data}
      measure={measure}
      controls={controls}
      category={option}
    />
  );
};

const MostWatchedFilms = ({ data, controls }: { data: Movie[]; controls: ReactNode }) => {
  const most = data.filter((movie) => movie.minutes).sortByKey("minutes");
  return (
    <MovieStatList
      controls={controls}
      icon={<Whatshot />}
      title="Most Watched"
      content={most}
      labelComponent={statsCardLabelScore}
    />
  );
};

const MostWatchedCategory = ({
  data,
  measure,
  category,
  controls,
}: {
  data: Movie[];
  measure: Measure;
  category: MovieTopOption;
  controls: ReactNode;
}) => {
  const scheme = useScheme();

  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Watched"
      option={category}
      groups={groupMoviesBy(data, category, measure)}
      labelComponent={(group) => [[group.name, `${format(group.count)} ${measure}`]]}
      colourOf={(top) => groupToColour(category, top, scheme)}
      MediaComponent={MovieCardMediaImage}
      dialogSort={(movies) => movies.toSorted((a, b) => b.minutes - a.minutes)}
      nameOf={movieKey}
      dialogLabelComponent={statsCardLabelWatched}
      dialogChipComponent={(movie) => movieScoreChip(movie, scheme)}
      {...movieStatListSharedProps}
    />
  );
};

/** The corner badge: the film's score, wearing its band's fill. Unscored films carry none. */
const movieScoreChip = (movie: Movie, scheme: Scheme) =>
  movie.score !== undefined
    ? { label: String(movie.score), colour: scoreBandToColour(scoreBand(movie.score), scheme) }
    : undefined;

const movieStatListSharedProps: Pick<StatListBaseProps<Movie>, "shape" | "divider" | "width"> & GridListLayout = {
  // Banners, the shape the sheet's artwork is drawn at and the library grid shows it at — the
  // same layout the Games tab gives its own.
  shape: "landscape",
  divider: true,
  width: [12, 12, 6],
  pictureWidth: [12, 4, 6],
  dialogPictureWidth: [12, 6, 4],
};

const MovieStatList = (
  props: Omit<
    StatListBaseProps<Movie>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof movieStatListSharedProps
  >,
) => {
  const scheme = useScheme();

  return (
    <StatList
      chipComponent={(movie) => movieScoreChip(movie, scheme)}
      MediaComponent={MovieCardMediaImage}
      nameComponent={movieKey}
      {...movieStatListSharedProps}
      {...props}
    />
  );
};

export default Stats;
