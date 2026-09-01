import {
  Animation,
  AutoGraph,
  Category,
  Pause,
  PlayArrow,
  ShowChart,
  Stars,
  TaskAlt,
  Tv,
  VerifiedUser,
  Whatshot,
} from "@mui/icons-material";
import {
  groupToColour,
  typeToColour,
  typeToName,
  type Measure,
  type Season,
  type Show,
  type Status,
  type Type,
} from "./types";
import {
  StatCard,
  StatList,
  StatsListProps,
  StatSummary,
  TotalsBand,
  VitalsCard,
  YearVitalsPair,
} from "../common/Stats";
import { TopCategoryBand } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import { Hero } from "../common/Hero";
import ShowCardMediaImage from "./CardMediaImage";
import { genreToColour, statusToColour } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import { CURRENT_PLAINDATE, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { SHOW_SECTIONS } from "./sections";
import { format } from "../utils/mathUtils";
import type { FilterDispatch } from "./filterUtils";
import {
  allTimeTotals,
  groupShowsBy,
  heroSeason,
  measureOf,
  showHeroStats,
  minutesPerEpisode,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  showTopOptions,
  statsCardLabelRecentlyComplete,
  statsCardLabelWatching,
  yearlyAverages,
  type ShowTopOption,
} from "./statsData";
import { useSelectBox } from "../common/SelectBoxHook";
import { useFranchiseShows } from "./franchiseContext";
import "../utils/arrayUtils";

const Stats = ({
  data,
  watching,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: Show[];
  watching: Season[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Stack spacing={2}>
      {/* The page's "now": the show the sheet's Last Watched column marks as current, promoted
          the way the games tab promotes the game in progress, with the rest of the in-flight
          shows in a compact strip below it. Until the sheet marks anything the hero has no
          honest pick — several shows are always on the go — and the strip stands alone.
          Nothing being watched and the section is not rendered at all. `watching` is computed
          by `Graphs`, which decides on the same value whether the rail offers a chip here. */}
      {watching.length > 0 && <Now watching={watching} />}
      <Section id={SHOW_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            allTime={allTimeTotals(data)}
            inYear={seasonsInYear(data, yearTo)}
          />
          <StatSummary
            icon={<ShowChart />}
            title="Yearly Average"
            stats={yearlyAverages(data)}
          />
          <ShowAverage data={data} />
          <Vitals
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={SHOW_SECTIONS.top}>
        <StatBand>
          <TopCategories
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={SHOW_SECTIONS.explore}>
        <StatBand>
          <MostWatched
            data={data}
            measure={measure}
          />
          <RecentlyComplete data={data} />
        </StatBand>
      </Section>
    </Stack>
  );
};

const Now = ({ watching }: { watching: Season[] }) => {
  const hero = heroSeason(watching);

  return (
    <Section id={SHOW_SECTIONS.now}>
      <Stack spacing={2}>
        {hero && <ShowHero season={hero} />}
        {/* The whole in-flight list, the hero's show included: the hero is a spotlight on the
            strip, not a removal from it, so the strip stays the one complete answer to "what is
            being watched". */}
        <StatBand>
          <CurrentlyWatching watching={watching} />
        </StatBand>
      </Stack>
    </Section>
  );
};

/**
 * The franchise count comes from the index the tab already built for the card strips, so the
 * hero and the strip inside the card it opens cannot disagree about how many shows a series
 * holds.
 */
const ShowHero = ({ season }: { season: Season }) => {
  const scheme = useScheme();

  const franchise = useFranchiseShows(season.show);

  return (
    <Hero
      item={season}
      MediaComponent={ShowCardMediaImage}
      kicker={`Last watched · ${formatDate(season.show.lastWatchedDate!)}`}
      // The same badge the strip's cards carry, so being promoted does not cost the show its place.
      chip={{ label: `S${season.s}E${season.e}`, colour: statusToColour(season.show, scheme) }}
      title={season.show.name}
      // The genre wears the same swatch its ledger row and every genre wedge on the tab wear.
      subtitle={[
        { text: season.show.network },
        { text: season.show.genre, swatch: genreToColour(season.show.genre, scheme) },
      ]}
      stats={showHeroStats(season, franchise.length, CURRENT_PLAINDATE)}
    />
  );
};

/** The one band saying what the library is made of, dense enough to scan past. */
const Vitals = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const scheme = useScheme();

  const statusList: Status[] = ["Watching", "Up To Date", "Ended", "Cancelled", "Abandoned"];
  const typeList: Type[] = ["show", "anime"];
  const measureFunc = (shows: Show[]) => measureOf(shows, measure);

  return (
    <VitalsCard>
      <TotalsBand
        title={"Status"}
        icon={<TaskAlt />}
        data={data}
        measureFunc={measureFunc}
        group={statusList}
        groupOf={(show) => show.status}
        groupToColour={(ele: Status) => statusToColour({ status: ele }, scheme)}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Type"}
        icon={<Animation />}
        data={data}
        measureFunc={measureFunc}
        group={typeList}
        groupOf={(show) => show.type}
        groupToColour={(ele: Type) => typeToColour({ type: ele }, scheme)}
        groupToLabel={typeToName}
        measureLabel={measure}
      />
    </VitalsCard>
  );
};

const ShowAverage = ({ data }: { data: Show[] }) => {
  const { seasons, episodes, hours } = perShowAverages(data);
  return (
    <StatCard
      icon={<AutoGraph />}
      title="Show Average"
      content={[
        ["Seasons", seasons],
        ["Episodes", episodes],
        ["Hours", hours],
        ["Min / Ep", minutesPerEpisode(data)],
      ]}
    />
  );
};

const TopCategories = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const scheme = useScheme();

  return (
    <TopCategoryBand
      defaults={["genre", "network", "franchise"]}
      options={showTopOptions}
      icons={optionIcons}
      groups={(option) => groupShowsBy(data, option, measure)}
      colourOf={(option, top: Show) => groupToColour(option, top, scheme)}
      measureLabel={measure}
    />
  );
};

const optionIcons: Record<ShowTopOption, ReactNode> = {
  genre: <Category />,
  network: <Tv />,
  franchise: <Stars />,
  type: <Animation />,
  status: <TaskAlt />,
  rating: <VerifiedUser />,
};

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const scheme = useScheme();

  const recent = recentlyComplete(data);
  return (
    <ShowStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      chipComponent={({ show }) => ({ label: show.status, colour: statusToColour(show, scheme) })}
      labelComponent={statsCardLabelRecentlyComplete}
    />
  );
};

const mostWatchedOptions = ["name", ...showTopOptions] as const;

const MostWatched = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(mostWatchedOptions, "name");

  if (option === "name") {
    return (
      <MostWatchedShows
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

const MostWatchedShows = ({ data, controls }: { data: Show[]; controls: ReactNode }) => {
  const most = data.filter((show) => show.minutes).sortByKey("minutes");
  return (
    <ShowsStatList
      controls={controls}
      icon={<Whatshot />}
      title="Most Watched"
      content={most}
      labelComponent={(show) => [[`${format(show.e)} Eps`, `${format(Math.floor(show.minutes / 60))} Hours`]]}
    />
  );
};

const MostWatchedCategory = ({
  data,
  measure,
  category,
  controls,
}: {
  data: Show[];
  measure: Measure;
  category: ShowTopOption;
  controls: ReactNode;
}) => {
  const scheme = useScheme();

  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Watched"
      option={category}
      groups={groupShowsBy(data, category, measure)}
      labelComponent={(group) => [[group.name, `${format(group.count)} ${measure}`]]}
      colourOf={(top) => groupToColour(category, top, scheme)}
      MediaComponent={ShowCardMediaImage}
      dialogSort={(shows) => shows.toSorted((a, b) => b.minutes - a.minutes)}
      nameOf={(show) => show.name}
      dialogLabelComponent={(show) => [[`${format(show.e)} Eps`, `${format(Math.floor(show.minutes / 60))} Hours`]]}
      dialogChipComponent={(show) => ({ label: show.status, colour: statusToColour(show, scheme) })}
      aspectRatio="auto 2 / 3"
      width={[12, 12, 12]}
      pictureWidth={[6, 4, 2]}
      dialogPictureWidth={[6, 4, 2]}
    />
  );
};

const CurrentlyWatching = ({ watching }: { watching: Season[] }) => {
  const scheme = useScheme();

  return (
    <ShowStatList
      icon={<PlayArrow />}
      title="Currently Watching"
      content={watching}
      // One badge saying exactly where you are, in the colour every chart paints "still going" in.
      chipComponent={(season) => ({ label: `S${season.s}E${season.e}`, colour: statusToColour(season.show, scheme) })}
      wrap={false}
      labelComponent={(season) => statsCardLabelWatching(season, CURRENT_PLAINDATE)}
    />
  );
};

const ShowStatList = (
  props: Omit<
    StatsListProps<Season>,
    "MediaComponent" | "nameComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  > &
    Partial<Pick<StatsListProps<Season>, "pictureWidth">>,
) => {
  return (
    <StatList
      MediaComponent={ShowCardMediaImage}
      nameComponent={(entry) => entry.show.name + entry.s}
      // The wall's poster reservation, so lazily-loaded artwork holds its height — a dialog of
      // cards with no reserved ratio all sits inside the viewport at once and fetches every image
      // immediately. The leading `auto` keeps it a reservation rather than a crop: show artwork is
      // portrait, and a fixed ratio would cover-crop every poster into a landscape sliver.
      aspectRatio="auto 2 / 3"
      width={[12, 12, 12]}
      pictureWidth={[6, 4, 2]}
      dialogPictureWidth={[6, 4, 2]}
      {...props}
    />
  );
};

/** The Show-typed sibling of `ShowStatList`, for the lists whose rows are whole shows. */
const ShowsStatList = (
  props: Omit<
    StatsListProps<Show>,
    "MediaComponent" | "nameComponent" | "chipComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  >,
) => {
  const scheme = useScheme();

  return (
    <StatList
      MediaComponent={ShowCardMediaImage}
      nameComponent={(entry) => entry.name}
      chipComponent={(show) => ({ label: show.status, colour: statusToColour(show, scheme) })}
      aspectRatio="auto 2 / 3"
      width={[12, 12, 12]}
      pictureWidth={[6, 4, 2]}
      dialogPictureWidth={[6, 4, 2]}
      {...props}
    />
  );
};

export default Stats;
