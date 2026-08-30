import {
  Animation,
  AutoGraph,
  Category,
  ExpandCircleDown,
  Pause,
  PlayArrow,
  ShowChart,
  Stars,
  TaskAlt,
  Timer,
  Tv,
  Update,
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
import { StatCard, StatList, StatsListProps, TotalsBand, VitalsCard } from "../common/Stats";
import { TopListCard } from "../common/TopList";
import { DrilldownDialog } from "../common/DrilldownDialog";
import { YearSelect } from "../common/YearSelect";
import { Hero } from "../common/Hero";
import ShowCardMediaImage from "./CardMediaImage";
import { NEUTRAL_FILL, statusToColour } from "../utils/types";
import { Radio, Stack, Typography } from "@mui/material";
import { capitalize } from "@mui/material/utils";
import { useState, type ReactNode } from "react";
import { CURRENT_PLAINDATE, CURRENT_YEAR, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { SHOW_SECTIONS } from "./sections";
import { format } from "../utils/mathUtils";
import { highchartsColors } from "../highcharts";
import type { FilterDispatch } from "./filterUtils";
import {
  allTimeTotals,
  groupShowsBy,
  heroSeason,
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
import { topNWithOther } from "../common/statsData";
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
            stats={seasonsInYear(data, yearTo)}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
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
  const franchise = useFranchiseShows(season.show);

  return (
    <Hero
      item={season}
      MediaComponent={ShowCardMediaImage}
      kicker={`Last watched · ${formatDate(season.show.lastWatchedDate!)}`}
      // The same badge the strip's cards carry, so being promoted does not cost the show its place.
      chip={{ label: `S${season.s}E${season.e}`, colour: statusToColour(season.show) }}
      title={season.show.name}
      subtitle={[season.show.network, season.show.genre].filter(Boolean).join(" · ")}
      stats={showHeroStats(season, franchise.length, CURRENT_PLAINDATE)}
    />
  );
};

/** The one band saying what the library is made of, dense enough to scan past. */
const Vitals = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const statusList: Status[] = ["Watching", "Up To Date", "Ended", "Cancelled", "Abandoned"];
  const typeList: Type[] = ["show", "anime"];
  const measureFunc = (shows: Show[]) =>
    measure === "Episodes" ? shows.sum("e") : Math.floor(shows.sum("minutes") / 60);

  return (
    <VitalsCard>
      <TotalsBand
        title={"Status"}
        icon={<TaskAlt />}
        data={data}
        measureFunc={measureFunc}
        groupKey="status"
        group={statusList}
        groupToColour={(ele: Status) => statusToColour({ status: ele })}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Type"}
        icon={<Animation />}
        data={data}
        measureFunc={measureFunc}
        groupKey="type"
        group={typeList}
        groupToColour={(ele: Type) => typeToColour({ type: ele })}
        groupToLabel={typeToName}
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

const TopCategories = ({ data, measure }: { data: Show[]; measure: Measure }) => (
  <>
    {(["genre", "network", "franchise"] as const).map((category) => (
      <TopList
        key={category}
        data={data}
        measure={measure}
        defaultCategory={category}
      />
    ))}
  </>
);

const optionIcons: Record<ShowTopOption, ReactNode> = {
  genre: <Category />,
  network: <Tv />,
  franchise: <Stars />,
  type: <Animation />,
  status: <TaskAlt />,
  rating: <VerifiedUser />,
};

const TopList = ({
  data,
  measure,
  defaultCategory,
}: {
  data: Show[];
  measure: Measure;
  defaultCategory: ShowTopOption;
}) => {
  const [option, controls] = useSelectBox(showTopOptions, defaultCategory);
  const colorOffset = showTopOptions.indexOf(option) * 3;

  const most = topNWithOther(groupShowsBy(data, option, measure));

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

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const recent = recentlyComplete(data);
  return (
    <ShowStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      chipComponent={({ show }) => ({ label: show.status, colour: statusToColour(show) })}
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
  const most = groupShowsBy(data, category, measure);

  const [dialogContent, setDialogContent] = useState<(typeof most)[number] | null>(null);

  const dialog = dialogContent ? (
    <DrilldownDialog
      title={dialogContent.name}
      onClose={() => setDialogContent(null)}
      // Sorted here rather than in `groupShowsBy`, which would sort every category on every
      // render to serve the one being drilled into.
      content={dialogContent.all.sortByKey("minutes")}
      cardKey={(entry) => category + "-statslistcard-" + entry.name}
      labelComponent={(show) => [[`${format(show.e)} Eps`, `${format(Math.floor(show.minutes / 60))} Hours`]]}
      chipComponent={(show) => ({ label: show.status, colour: statusToColour(show) })}
      pictureWidth={[6, 4, 2]}
      MediaComponent={ShowCardMediaImage}
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
        labelComponent={(item: (typeof most)[0]) => [[item.name, `${format(item.count)} ${measure}`]]}
        MediaComponent={(props) => (
          <ShowCardMediaImage
            {...props}
            item={props.item.top}
            colour={groupToColour(category, props.item.top)}
          />
        )}
        nameComponent={(entry) => entry.name}
        width={[12, 12, 12]}
        pictureWidth={[6, 4, 2]}
        dialogPictureWidth={[6, 4, 2]}
      />
      {dialog}
    </>
  );
};

const CurrentlyWatching = ({ watching }: { watching: Season[] }) => (
  <ShowStatList
    icon={<PlayArrow />}
    title="Currently Watching"
    content={watching}
    // One badge saying exactly where you are, in the colour every chart paints "still going" in.
    chipComponent={(season) => ({ label: `S${season.s}E${season.e}`, colour: statusToColour(season.show) })}
    wrap={false}
    labelComponent={(season) => statsCardLabelWatching(season, CURRENT_PLAINDATE)}
  />
);

const ShowStatList = (
  props: Omit<
    StatsListProps<Season>,
    "MediaComponent" | "nameComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  > &
    Partial<Pick<StatsListProps<Season>, "pictureWidth">>,
) => (
  <StatList
    MediaComponent={ShowCardMediaImage}
    nameComponent={(entry) => entry.show.name + entry.s}
    width={[12, 12, 12]}
    pictureWidth={[6, 4, 2]}
    dialogPictureWidth={[6, 4, 2]}
    {...props}
  />
);

/** The Show-typed sibling of `ShowStatList`, for the lists whose rows are whole shows. */
const ShowsStatList = (
  props: Omit<
    StatsListProps<Show>,
    "MediaComponent" | "nameComponent" | "chipComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  >,
) => (
  <StatList
    MediaComponent={ShowCardMediaImage}
    nameComponent={(entry) => entry.name}
    chipComponent={(show) => ({ label: show.status, colour: statusToColour(show) })}
    width={[12, 12, 12]}
    pictureWidth={[6, 4, 2]}
    dialogPictureWidth={[6, 4, 2]}
    {...props}
  />
);

export default Stats;
