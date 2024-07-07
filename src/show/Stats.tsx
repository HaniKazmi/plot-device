import { AutoGraph, Pause, PlayArrow, ShowChart, TaskAlt, Timer, Update } from "@mui/icons-material";
import Grid from "@mui/material/Unstable_Grid2";
import { format } from "../utils/mathUtils";
import { Season, Show, Status } from "./types";
import { StatCard, StatList, StatsListProps, TotalStack } from "../common/Stats";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { Stack } from "@mui/material";
import { CURRENT_YEAR, YearNumber } from "../common/date";

const Stats = ({ data }: { data: Show[] }) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <AllTime data={data} />
      <ThisYearSoFar data={data} />
      <Averages data={data} />
      <AveragesPerShow data={data} />
      <Totals data={data} />
      <CurrentlyPlaying data={data} />
      <RecentlyComplete data={data} />
    </Grid>
  );
};

const Totals = ({ data }: { data: Show[] }) => {
  const statusList: Status[] = ["Watching", "Up To Date", "Ended", "Cancelled", "Abandoned"];
  return (
    <Grid xs={12}>
      <Stack justifyContent="space-between" height="100%" spacing={1}>
        <TotalStack
          title={"Status"}
          icon={<TaskAlt />}
          data={data}
          groupKey="status"
          group={statusList}
          groupToColour={(ele: Status) => statusToColour({ status: ele })}
          measureLabel="Shows"
        />
      </Stack>
    </Grid>
  );
};

const AllTime = ({ data }: { data: Show[] }) => {
  const totalShows = data.length;
  const totalEpisodes = data.sum("e");
  const totalTime = Math.floor(data.sum("minutes") / 60);
  return (
    <StatCard
      icon={<Timer />}
      title="All Time"
      content={[
        ["Shows", totalShows],
        ["Episodes", totalEpisodes],
        ["Hours", totalTime],
      ]}
    />
  );
};

const ThisYearSoFar = ({ data }: { data: Show[] }) => {
  const filtered = data.flatMap((show) => show.s).filter((s) => s.startDate.year === CURRENT_YEAR);
  const totalSeasons = filtered.length;
  const totalEpisodes = filtered.sum("e");
  const totalTime = Math.floor(filtered.sum("minutes") / 60);
  return (
    <StatCard
      icon={<Update />}
      title={`In ${CURRENT_YEAR}`}
      content={[
        ["Seasons", totalSeasons],
        ["Episodes", totalEpisodes],
        ["Hours", totalTime],
      ]}
    />
  );
};

const Averages = ({ data }: { data: Show[] }) => {
  const grouped = data
    .flatMap((show) => show.s)
    .reduce(
      (tree, s) => {
        if (!s.minutes) return tree;
        const year = s.startDate.year;
        tree[year] ??= { seasons: 0, episodes: 0, minutes: 0 };
        tree[year].seasons += 1;
        tree[year].episodes += s.e;
        tree[year].minutes += s.minutes;
        return tree;
      },
      {} as Record<YearNumber, { seasons: number; episodes: number; minutes: number }>,
    );

  const seasons = Math.floor(Object.values(grouped).sum("seasons") / Object.keys(grouped).length);
  const episodes = Math.floor(Object.values(grouped).sum("episodes") / Object.keys(grouped).length);
  const hours = Math.floor(Object.values(grouped).sum("minutes") / Object.keys(grouped).length / 60);

  return (
    <StatCard
      icon={<ShowChart />}
      title="Yearly Average"
      content={[
        ["Seasons", seasons],
        ["Episodes", episodes],
        ["Hours", hours],
      ]}
    />
  );
};

const AveragesPerShow = ({ data }: { data: Show[] }) => {
  const filtered = data.flatMap((show) => show.s);
  const totalSeasons = Math.round(filtered.length / data.length);
  const totalEpisodes = Math.round(filtered.sum("e") / data.length);
  const totalTime = Math.floor(filtered.sum("minutes") / 60 / data.length);

  return (
    <StatCard
      icon={<AutoGraph />}
      title="Show Average"
      content={[
        ["Seasons", totalSeasons],
        ["Episodes", totalEpisodes],
        ["Hours", totalTime],
      ]}
    />
  );
};

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const recent = data
    .flatMap((show) => show.s)
    .filter((season) => season.endDate)
    .sort((seasonA, seasonB) => (seasonA.endDate! < seasonB.endDate! ? 1 : -1))
    .slice(0, 6);
  return (
    <ShowStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      width={[12, 12, 12]}
      pictureWidth={[6, 4, 2]}
      chipComponent={({ show }) => [show.status, statusToColour(show)]}
      labelComponent={statsCardLabelRecentlyComplete}
    />
  );
};

const statsCardLabelRecentlyComplete = (season: Season) => [
  [`S ${season.s}`, season.endDate?.toString() ?? ""],
  [`${season.e} Eps`, `${format(Math.round(season.minutes / 60))} Hours`],
];

const CurrentlyPlaying = ({ data }: { data: Show[] }) => {
  const recent = data
    .filter((show) => show.status === "Watching")
    .map((show) => show.s.at(-1)!)
    .filter((season) => !season.endDate)
    .sort((seasonA, seasonB) => (seasonA.startDate < seasonB.startDate ? 1 : -1));
  return (
    <ShowStatList
      icon={<PlayArrow />}
      title="Currently Watching"
      content={recent}
      width={[12, 12, 12]}
      pictureWidth={[6, 4, 2]}
      labelComponent={statsCardLabelCurrentlyPlaying}
    />
  );
};

const statsCardLabelCurrentlyPlaying = (season: Season) => [[`S ${season.s}`, season.startDate?.toString() ?? ""]];

const ShowStatList = (props: Omit<StatsListProps<Season>, "MediaComponent">) => (
  <StatList MediaComponent={ShowCardMediaImage} {...props} />
);

export default Stats;
