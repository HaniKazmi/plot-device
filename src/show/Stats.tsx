import {
  Animation,
  AutoGraph,
  Category,
  History,
  PlayArrow,
  ShowChart,
  Stars,
  TaskAlt,
  Tv,
  VerifiedUser,
  Whatshot,
} from "@mui/icons-material";
import { ANIME_GROUP, groupToColour, animeLabel, type Measure, type Season, type Show, type Status } from "./types";
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
import ShowCardMediaImage, { ShowFranchiseStrip } from "./CardMediaImage";
import { showSubtitle } from "./cardData";
import { animeToColour, statusToColour, type Scheme } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
import { CURRENT_PLAINDATE, formatDate, type YearNumber } from "../common/date";
import type { YearType } from "../common/filterReducer";
import { Section, StatBand } from "../common/SectionRail";
import { SHOW_SECTIONS } from "./sections";
import { stated } from "../common/population";
import {
  allTimeTotals,
  groupShowsBy,
  measureOf,
  showHeroStats,
  minutesPerEpisode,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  showTopOptions,
  statsCardLabelEpsHours,
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
  hasNow,
  hero,
  watching,
  measure,
  yearType,
  yearTo,
}: {
  data: Show[];
  hasNow: boolean;
  hero?: Season;
  watching: Season[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
}) => {
  return (
    <Stack spacing={2}>
      {/* The page's "now": the season holding the last episode watched, promoted the way the games
          tab promotes the game in progress, with whatever is in flight in a compact strip below
          it. Whether there is a section at all is `Graphs`' own answer, passed down rather than
          asked again: the rail's chip is offered on that same value, and a chip pointing at an
          anchor the page never rendered is what two derivations of one test buy. */}
      {hasNow && (
        <Now
          hero={hero}
          watching={watching}
        />
      )}
      <Section id={SHOW_SECTIONS.vitals}>
        <StatBand>
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearVitalsPair
            yearTo={yearTo}
            yearType={yearType}
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

const Now = ({ hero, watching }: { hero?: Season; watching: Season[] }) => (
  <Section id={SHOW_SECTIONS.now}>
    <Stack spacing={2}>
      {hero && <ShowHero season={hero} />}
      {/* The two answer different questions — what was watched last, and what is in flight — and
          may or may not name the same season, so each stands on its own test. The strip is the
          whole in-flight list, the hero's own show included where it is one of them. */}
      {watching.length > 0 && (
        <StatBand>
          <CurrentlyWatching watching={watching} />
        </StatBand>
      )}
    </Stack>
  </Section>
);

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
      shape="poster"
      // The episode in hand as well as the date: the title is the show's name, and nothing else
      // on the hero says which season it is on. `heroSeason` elects on that date, so the season
      // carries one.
      kicker={`Last watched · S${season.s}E${season.e} · ${formatDate(season.lastWatchedDate!)}`}
      title={season.show.name}
      // The genre wears the same swatch its ledger row and every genre wedge on the tab wear.
      subtitle={showSubtitle(season.show, scheme)}
      stats={showHeroStats(season, franchise.length, CURRENT_PLAINDATE)}
      strip={
        <ShowFranchiseStrip
          show={season.show}
          season={season}
          variant="hero"
        />
      }
    />
  );
};

/** The one band saying what the library is made of, dense enough to scan past. */
const Vitals = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const scheme = useScheme();

  const statusList: Status[] = ["Watching", "Up To Date", "Ended", "Cancelled", "Abandoned"];
  // The domain's own pair, which is also what the filter's chips offer: the array is the bar order,
  // and a word restated here could drift from `animeLabel` and drop a bar with nothing to say so.
  const animeList = ANIME_GROUP;
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
        title={"Anime"}
        icon={<Animation />}
        data={data}
        measureFunc={measureFunc}
        group={animeList}
        groupOf={animeLabel}
        groupToColour={(label: string) => animeToColour(label, scheme)}
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
  anime: <Animation />,
  status: <TaskAlt />,
  certificate: <VerifiedUser />,
};

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const scheme = useScheme();

  const recent = recentlyComplete(data);
  return (
    <ShowStatList
      icon={<History />}
      title="Recently Watched"
      content={recent}
      chipComponent={({ show }) => showStatusChip(show, scheme)}
      labelComponent={statsCardLabelRecentlyComplete}
    />
  );
};

const mostWatchedOptions = ["name", ...showTopOptions] as const;

const MostWatched = ({ data, measure }: { data: Show[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(mostWatchedOptions, "name", "By");

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
      labelComponent={statsCardLabelEpsHours}
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
      labelComponent={(group) => [[group.name, stated(group.count, measure)]]}
      colourOf={(top) => groupToColour(category, top, scheme)}
      MediaComponent={ShowCardMediaImage}
      dialogSort={(shows) => shows.toSorted((a, b) => b.minutes - a.minutes)}
      nameOf={(show) => show.name}
      dialogLabelComponent={statsCardLabelEpsHours}
      dialogChipComponent={(show) => showStatusChip(show, scheme)}
      {...showStatListSharedProps}
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
      // One badge saying how far the show is through, in the colour every chart paints "still
      // going" in — the season on a card that has ended is the one the reader is up to date on.
      chipComponent={(season) => ({ label: `S${season.s}E${season.e}`, colour: statusToColour(season.show, scheme) })}
      wrap={false}
      labelComponent={(season) => statsCardLabelWatching(season, CURRENT_PLAINDATE)}
    />
  );
};

/** The corner badge naming a show's status, in the colour that vocabulary wears everywhere on the tab. */
const showStatusChip = (show: Show, scheme: Scheme) => ({ label: show.status, colour: statusToColour(show, scheme) });

// Reserved so lazily-loaded artwork holds its height: a dialog of cards reserving nothing all
// sits inside the viewport at once and fetches every image immediately. The strip holds the
// shape firmly rather than yielding to each file, which `common/Stats.tsx` explains at the site
// that decides it.
const showStatListSharedProps: Pick<StatListBaseProps<Show>, "shape" | "width"> & GridListLayout = {
  shape: "poster",
  width: [12, 12, 12],
  // Four to a row at `md`, six from `lg`: six posters at 900px are 133px each, where a card's date
  // and "days in" cannot share a footer line.
  pictureWidth: [6, 4, 3, 2],
  dialogPictureWidth: [6, 4, 2],
};

const ShowStatList = (
  props: Omit<StatListBaseProps<Season>, "MediaComponent" | "nameComponent" | "width"> &
    Partial<Pick<GridListLayout, "pictureWidth">>,
) => {
  return (
    <StatList
      MediaComponent={ShowCardMediaImage}
      nameComponent={(entry) => entry.show.name + entry.s}
      {...showStatListSharedProps}
      {...props}
    />
  );
};

/** The Show-typed sibling of `ShowStatList`, for the lists whose rows are whole shows. */
const ShowsStatList = (
  props: Omit<StatListBaseProps<Show>, "MediaComponent" | "nameComponent" | "chipComponent" | "width">,
) => {
  const scheme = useScheme();

  return (
    <StatList
      MediaComponent={ShowCardMediaImage}
      nameComponent={(entry) => entry.name}
      chipComponent={(show) => showStatusChip(show, scheme)}
      {...showStatListSharedProps}
      {...props}
    />
  );
};

export default Stats;
