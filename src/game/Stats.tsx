import {
  Album,
  Brush,
  Business,
  Category,
  Code,
  Gamepad,
  History,
  PlayArrow,
  ShowChart,
  SportsEsports,
  Stars,
  Storefront,
  TaskAlt,
  VerifiedUser,
  VideogameAsset,
  Whatshot,
} from "@mui/icons-material";
import { stated } from "../common/population";
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
import {
  StatCard,
  StatList,
  TotalsBand,
  VitalsCard,
  YearVitalsPair,
  type GridListLayout,
  type StatListBaseProps,
} from "../common/Stats";
import { TopCategoryBand } from "../common/TopList";
import { GroupedStatList } from "../common/GroupedStatList";
import GameCardMediaImage, { GameFranchiseStrip } from "./CardMediaImage";
import { useGameStripSource } from "./franchiseContext";
import { gameSubtitle, spanKey } from "./cardData";
import { Stack } from "@mui/material";
import { inProgressBeyondHero } from "../common/statsData";
import type { YearType } from "./filterUtils";
import { statusToColour } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { CURRENT_PLAINDATE, YearNumber } from "../common/date";
import { Hero } from "../common/Hero";
import { Section, StatBand } from "../common/SectionRail";
import { GAME_SECTIONS } from "./sections";
import type { ReactNode } from "react";
import { useSelectBox } from "../common/SelectBoxHook";
import "../utils/arrayUtils";
import { categoryKeys } from "../common/filterSchema";
import { gameFilters } from "./filters";

const Stats = ({
  data,
  upTo,
  playing,
  measure,
  yearType,
  yearTo,
}: {
  data: VideoGame[];
  /** The rows up to the scope's year whatever its reading, for the cards titled that way. */
  upTo: VideoGame[];
  /** Every game in progress, most recently started first. Computed by `Graphs`, which also
      decides on it whether the rail offers a chip pointing at the hero below. */
  playing: VideoGame[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
}) => {
  return (
    <Stack spacing={2}>
      {/* No game in progress and there is no "now" to lead with. */}
      {playing.length > 0 && (
        <Section id={GAME_SECTIONS.now}>
          <Stack spacing={2}>
            <GameHero game={playing[0]} />
            {inProgressBeyondHero(playing, playing[0]) && (
              <StatBand>
                <CurrentlyPlaying playing={playing} />
              </StatBand>
            )}
          </Stack>
        </Section>
      )}
      <Section id={GAME_SECTIONS.vitals}>
        <StatBand>
          {/* The first card and the average beside it count `upTo` rather than `data`: the scope
              read as a ceiling, which is what a card titled "All time" or "Up to 2019" states
              under either reading — fed the "In 2026" rows, it would restate the in-year figures
              under the wrong words. The in-year card narrows `data`, which under that reading is
              already the year. */}
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
            allTime={gamesAndHours(upTo)}
            inYear={gamesAndHours(data.filter((game) => game.startDate.year === yearTo))}
          />
          <Averages data={upTo} />
          <AveragesPerGame data={data} />
          <Vitals
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={GAME_SECTIONS.top}>
        <StatBand>
          <TopCategories
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
      <Section id={GAME_SECTIONS.explore}>
        <StatBand>
          <RecentlyComplete data={data} />
          <MostPlayed
            data={data}
            measure={measure}
          />
        </StatBand>
      </Section>
    </Stack>
  );
};

/** The game in progress, most recently begun. */
const GameHero = ({ game }: { game: VideoGame }) => {
  const scheme = useScheme();
  const hasStrip = useGameStripSource(game) !== undefined;

  return (
    <Hero
      item={game}
      MediaComponent={GameCardMediaImage}
      shape="banner"
      activity={{ doing: "Playing", since: game.startDate }}
      title={game.name}
      subtitle={gameSubtitle(game, scheme)}
      stats={heroStats(game, CURRENT_PLAINDATE)}
      // Only where there is a strip, so the panel lays its lower edge out for what it holds.
      strip={
        hasStrip && (
          <GameFranchiseStrip
            game={game}
            variant="hero"
          />
        )
      }
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
  const scheme = useScheme();

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
        groupToColour={(ele: Status) => statusToColour({ status: ele }, scheme)}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Platforms"}
        icon={<VideogameAsset />}
        data={data}
        measureFunc={measureFunc}
        group={companyList}
        groupOf={(game) => game.company}
        groupToColour={(ele: Company) => companyToColor({ company: ele }, scheme)}
        measureLabel={measure}
      />
    </VitalsCard>
  );
};

const Averages = ({ data }: { data: VideoGame[] }) => {
  const { games, hours } = yearlyAverages(data);

  return (
    <StatCard
      icon={<ShowChart />}
      title="Per Year"
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
      icon={<Gamepad />}
      title="Per Game"
      content={[
        ["Hours", hours],
        ["Days To Beat", days],
      ]}
    />
  );
};

const RecentlyComplete = ({ data }: { data: VideoGame[] }) => {
  const recent = data.filter((a) => a.hours && a.endDate).sortByKey("endDate");
  return (
    <GameStatList
      icon={<History />}
      title="Recently Finished"
      content={recent}
      labelComponent={statsCardLabelEndDateHours}
    />
  );
};

const MostPlayed = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(videoGameOptions, "name", "By");

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
    <GameStatList
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
  const scheme = useScheme();

  return (
    <GroupedStatList
      icon={<Whatshot />}
      controls={controls}
      title="Most Played"
      option={category}
      groups={groupGamesBy(data, category, measure)}
      labelComponent={(group) => [[group.name, stated(group.count, measure)]]}
      colourOf={(top) => groupToColour(category, top, scheme)}
      MediaComponent={GameCardMediaImage}
      // A dialog under a card headed Most Played opens largest-first, whatever slice of it the
      // reader scrolls. A numeric sort rather than `sortByKey`, which tests each key for falsiness
      // before comparing — the group keeps its untimed members, and every one of them would head
      // the list.
      dialogSort={(games) => games.toSorted((a, b) => (b.hours ?? 0) - (a.hours ?? 0))}
      nameOf={spanKey}
      dialogLabelComponent={statsCardLabelEndDateHours}
      dialogChipComponent={platformToShortChip}
      {...gameStatListSharedProps}
    />
  );
};

/** Every game in progress, the hero's own included, at the size Recently Finished draws a banner. */
const CurrentlyPlaying = ({ playing }: { playing: VideoGame[] }) => (
  <GameStatList
    icon={<PlayArrow />}
    title="Currently Playing"
    content={playing}
    labelComponent={statsCardLabelStartDate}
    wrap={false}
    width={[12, 12, 12]}
    pictureWidth={[12, 4, 3]}
  />
);

const TopCategories = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const scheme = useScheme();

  return (
    <TopCategoryBand
      defaults={["gameplay", "publisher", "franchise"]}
      options={topOptions}
      icons={optionIcons}
      groups={(option) => groupGamesBy(data, option, measure)}
      colourOf={(option, top: VideoGame) => groupToColour(option, top, scheme)}
      measureLabel={measure}
      categories={categoryKeys(gameFilters)}
    />
  );
};

const optionIcons: Record<TopOption, ReactNode> = {
  company: <Business />,
  format: <Album />,
  franchise: <Stars />,
  platform: <VideogameAsset />,
  developer: <Code />,
  publisher: <Storefront />,
  certificate: <VerifiedUser />,
  status: <TaskAlt />,
  gameplay: <SportsEsports />,
  genre: <Category />,
  style: <Brush />,
};

const gameStatListSharedProps: Pick<StatListBaseProps<VideoGame>, "shape" | "divider" | "width"> & GridListLayout = {
  shape: "banner",
  divider: true,
  width: [12, 12, 6],
  pictureWidth: [12, 4, 6],
  dialogPictureWidth: [12, 6, 4],
};

// The omitted props are the ones this wrapper supplies; `width` and `pictureWidth` come back as
// optional so a caller can override the shared default without being able to unset it.
const GameStatList = (
  props: Omit<
    StatListBaseProps<VideoGame>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof gameStatListSharedProps
  > &
    Partial<Pick<StatListBaseProps<VideoGame>, "width"> & Pick<GridListLayout, "pictureWidth">>,
) => (
  <StatList
    chipComponent={platformToShortChip}
    MediaComponent={GameCardMediaImage}
    nameComponent={spanKey}
    {...gameStatListSharedProps}
    {...props}
  />
);

export default Stats;
