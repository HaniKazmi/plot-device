import {
  Album,
  AutoGraph,
  Business,
  Category,
  Code,
  Pause,
  PlayArrow,
  ShowChart,
  SportsEsports,
  Stars,
  Storefront,
  TaskAlt,
  Timer,
  Update,
  VerifiedUser,
  VideogameAsset,
  Whatshot,
} from "@mui/icons-material";
import { format } from "../utils/mathUtils";
import {
  gamesAndHours,
  groupGamesBy,
  heroStats,
  perGameAverages,
  platformToShortChip,
  statsCardLabelEndDateHours,
  statsCardLabelStartDate,
  topOptions,
  yearlyAverages,
  type TopOption,
} from "./statsData";
import {
  companyToColor,
  groupToColour,
  videoGameOptions,
  type Company,
  type Measure,
  type Status,
  type VideoGame,
  type VideoGameStringKeys,
} from "./types";
import { StatCard, StatList, type StatsListProps, TotalsBand, VitalsCard, YearTotals } from "../common/Stats";
import { TopListCard } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import VgCardMediaImage from "./CardMediaImage";
import { gameSubtitle } from "./cardData";
import { Stack, Typography } from "@mui/material";
import type { FilterDispatch, YearType } from "./filterUtils";
import { statusToColour } from "../utils/types";
import { CURRENT_PLAINDATE, CURRENT_YEAR, formatDate, YearNumber } from "../common/date";
import { Hero } from "../common/Hero";
import { Section, StatBand } from "../common/SectionRail";
import { useFranchiseGames } from "./franchiseContext";
import { VG_SECTIONS } from "./sections";
import type { ReactNode } from "react";
import { useSelectBox } from "../common/SelectBoxHook";
import "../utils/arrayUtils";

const Stats = ({
  data,
  playing,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  /** Every game in progress, most recently started first. Computed by `Graphs`, which also
      decides on it whether the rail offers a chip pointing at the hero below. */
  playing: VideoGame[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Stack spacing={2}>
      {/* No game in progress and there is no "now" to lead with. */}
      {playing.length > 0 && (
        <Section id={VG_SECTIONS.now}>
          <VgHero game={playing[0]} />
        </Section>
      )}
      <Section id={VG_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearTotals
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Timer />}
            activeYearType="upto"
            stats={gamesAndHours(data)}
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
            stats={gamesAndHours(data.filter((game) => game.startDate.year === yearTo))}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
          />
          <Averages
            data={data}
            yearType={yearType}
          />
          <AveragesPerGame data={data} />
          <Vitals
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={VG_SECTIONS.top}>
        <StatBand>
          <TopCategories
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={VG_SECTIONS.explore}>
        <StatBand>
          <MostPlayed
            data={data}
            measure={measure}
          />
          <RecentlyComplete data={data} />
          {/* Everything being played that the hero above is not already showing. */}
          <CurrentlyPlaying playing={playing.slice(1)} />
        </StatBand>
      </Section>
    </Stack>
  );
};

/**
 * The franchise comes from the index the tab already built for the card strips rather than from
 * a second grouping of the same data, so the hero and the strip inside the card it opens cannot
 * come to disagree about how many games a series holds.
 */
const VgHero = ({ game }: { game: VideoGame }) => {
  const franchise = useFranchiseGames(game);

  return (
    <Hero
      item={game}
      MediaComponent={VgCardMediaImage}
      kicker={`Currently playing · since ${formatDate(game.startDate)}`}
      // The same badge every other playing game carries in the strip below, so being the one
      // promoted to the top of the page does not cost this game its platform.
      chip={platformToShortChip(game)}
      title={game.name}
      subtitle={gameSubtitle(game)}
      stats={heroStats(game, franchise, CURRENT_PLAINDATE)}
    />
  );
};

/**
 * Status and platforms as one band rather than two cards.
 *
 * They answer the same question at the same altitude — what the library is made of — so they read
 * as one thing to scan past on the way to the charts. Two full cards spent most of a screen
 * saying it.
 */
const Vitals = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const statusList: Status[] = ["Beat", "Playing", "Endless", "Abandoned"];
  const companyList: Company[] = ["Nintendo", "PlayStation", "PC", "iOS", "Xbox"];
  const measureFunc = (data: VideoGame[]) => (measure == "Games" ? data.length : data.sum("hours"));

  return (
    <VitalsCard>
      <TotalsBand
        title={"Status"}
        icon={<TaskAlt />}
        data={data}
        measureFunc={measureFunc}
        group={statusList}
        groupOf={(game) => game.status}
        groupToColour={(ele: Status) => statusToColour({ status: ele })}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Platforms"}
        icon={<VideogameAsset />}
        data={data}
        measureFunc={measureFunc}
        group={companyList}
        groupOf={(game) => game.company}
        groupToColour={(ele: Company) => companyToColor({ company: ele })}
        measureLabel={measure}
      />
    </VitalsCard>
  );
};

const Averages = ({ data, yearType }: { data: VideoGame[]; yearType: YearType }) => {
  if (yearType == "matching") return;
  const { games, hours } = yearlyAverages(data);

  return (
    <StatCard
      icon={<ShowChart />}
      title="Yearly Average"
      content={[
        ["Games", games],
        ["Hours", hours],
      ]}
    />
  );
};

const AveragesPerGame = ({ data }: { data: VideoGame[] }) => {
  const { hours, days } = perGameAverages(data);

  return (
    <StatCard
      icon={<AutoGraph />}
      title="Game Average"
      content={[
        ["Hours", hours],
        ["Days To Beat", days],
      ]}
    />
  );
};

const RecentlyComplete = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter(({ party }) => !party)
    .filter((a) => a.hours && a.endDate)
    .sortByKey("endDate");
  return (
    <VgStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      labelComponent={statsCardLabelEndDateHours}
    />
  );
};

const MostPlayed = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(videoGameOptions, "name");

  if (option === "name") {
    return (
      <MostPlayedGames
        data={data}
        controls={controls}
      />
    );
  }
  return (
    <MostPlayedCategory
      data={data}
      measure={measure}
      controls={controls}
      category={option}
    />
  );
};

const MostPlayedGames = ({ data, controls }: { data: VideoGame[]; controls: ReactNode }) => {
  const most = data.filter((a) => a.hours && a.endDate).sortByKey("hours");
  return (
    <VgStatList
      controls={controls}
      icon={<Whatshot />}
      title="Most Played"
      content={most}
      labelComponent={statsCardLabelEndDateHours}
    />
  );
};

const MostPlayedCategory = ({
  data,
  measure,
  category,
  controls,
}: {
  data: VideoGame[];
  measure: Measure;
  category: VideoGameStringKeys;
  controls: ReactNode;
}) => {
  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Played"
      option={category}
      groups={groupGamesBy(data, category, measure)}
      labelComponent={(group) => [[group.name, `${format(group.count)} ${measure}`]]}
      colourOf={(top) => groupToColour(category, top)}
      MediaComponent={VgCardMediaImage}
      // A dialog under a card headed Most Played opens largest-first, whatever slice of it the
      // reader scrolls.
      dialogSort={(games) => games.sortByKey("hours")}
      nameOf={(game) => game.name}
      dialogLabelComponent={statsCardLabelEndDateHours}
      dialogChipComponent={platformToShortChip}
      {...vgStatListSharedProps}
    />
  );
};

const CurrentlyPlaying = ({ playing }: { playing: VideoGame[] }) => {
  if (playing.length == 0) return null;
  return (
    <VgStatList
      icon={<PlayArrow />}
      title="Also Playing"
      content={playing}
      labelComponent={statsCardLabelStartDate}
      wrap={false}
      width={[12, 12, 4]}
      pictureWidth={[12, 4, 12]}
    />
  );
};

const TopCategories = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => (
  <>
    {(["gameplay", "publisher", "franchise"] as const).map((category) => (
      <TopListCard
        key={category}
        options={topOptions}
        defaultOption={category}
        icons={optionIcons}
        groups={(option) => groupGamesBy(data, option, measure)}
        colourOf={(option, top: VideoGame) => groupToColour(option, top)}
        measureLabel={measure}
      />
    ))}
  </>
);

const optionIcons: Record<TopOption, ReactNode> = {
  company: <Business />,
  format: <Album />,
  franchise: <Stars />,
  platform: <VideogameAsset />,
  developer: <Code />,
  publisher: <Storefront />,
  rating: <VerifiedUser />,
  status: <TaskAlt />,
  gameplay: <SportsEsports />,
  genre: <Category />,
};

const vgStatListSharedProps: Pick<
  StatsListProps<VideoGame>,
  "aspectRatio" | "divider" | "width" | "pictureWidth" | "dialogPictureWidth"
> = {
  aspectRatio: "16/9",
  divider: true,
  width: [12, 12, 6],
  pictureWidth: [12, 4, 6],
  dialogPictureWidth: [12, 6, 4],
};

// The omitted props are the ones this wrapper supplies; `width` and `pictureWidth` come back as
// optional so a caller can override the shared default without being able to unset it.
const VgStatList = (
  props: Omit<
    StatsListProps<VideoGame>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof vgStatListSharedProps
  > &
    Partial<Pick<StatsListProps<VideoGame>, "width" | "pictureWidth">>,
) => (
  <StatList
    chipComponent={platformToShortChip}
    MediaComponent={VgCardMediaImage}
    nameComponent={(entry) => entry.name}
    {...vgStatListSharedProps}
    {...props}
  />
);

export default Stats;
