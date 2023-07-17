import { AutoGraph, Pause, PlayArrow, ShowChart, Timer, Update } from "@mui/icons-material";
import Grid from "@mui/material/Unstable_Grid2";
import { CURRENT_YEAR } from "../utils/dateUtils";
import { format } from "../utils/mathUtils";
import { Season, Show } from "./types";
import { StatCard, StatList } from "../common/Stats";

const Stats = ({ data }: { data: Show[] }) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <AllTime data={data} />
      <ThisYearSoFar data={data} />
      <Averages data={data} />
      <AveragesPerShow data={data} />
      <RecentlyComplete data={data} />
      <CurrentlyPlaying data={data} />
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
  const filtered = data.flatMap((show) => show.s).filter((s) => s.startDate.getFullYear() === CURRENT_YEAR);
  const totalSeasons = filtered.length;
  const totalEpisodes = filtered.sum("e");
  const totalTime = Math.floor(filtered.sum("minutes") / 60);
  return (
    <StatCard
      icon={<Update />}
      title="This Year So Far"
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
    .reduce((tree, s) => {
      const year = s.startDate.getFullYear().toString();
      if (!year || !s.minutes) return tree;

      if (!tree[year]) {
        tree[year] = [0, 0, 0];
      }
      tree[year] = [tree[year][0] + 1, tree[year][1] + s.e, tree[year][2] + s.minutes];
      return tree;
    }, {} as Record<string, [number, number, number]>);

  const seasons = Math.floor(Object.values(grouped).sum(0) / Object.keys(grouped).length);
  const episodes = Math.floor(Object.values(grouped).sum(1) / Object.keys(grouped).length);
  const hours = Math.floor(Object.values(grouped).sum(2) / Object.keys(grouped).length / 60);

  return (
    <StatCard
      icon={<ShowChart />}
      title="Averages Per Year"
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
      title="Averages Per Show"
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
    .flatMap((show) => show.s.map((s) => [show, s] as [Show, Season]))
    .filter(([, season]) => season.endDate)
    .sort(([, seasonA], [, seasonB]) => (seasonA.endDate! < seasonB.endDate! ? 1 : -1))
    .slice(0, 6);
  return (
    <StatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      width={12}
      pictureWdith={2}
      labelComponent={statsCardLabelStatsCardLabelRecentlyComplete}
    />
  );
};

const statsCardLabelStatsCardLabelRecentlyComplete = (season: Season) => [
  [`S ${season.s}`, season.endDate?.toLocaleDateString() || ""],
  [`${season.e} Eps`, `${format(Math.round(season.minutes! / 60))} Hours`],
];

const CurrentlyPlaying = ({ data }: { data: Show[] }) => {
  const recent = data
    .filter((show) => show.status === "Watching")
    .map((show) => [show, show.s.at(-1)] as [Show, Season])
    .filter(([_, season]) => !season.endDate)
    .sort(([, seasonA], [, seasonB]) => (seasonA.startDate! < seasonB.startDate! ? 1 : -1))
    .slice(0, 6);
  return (
    <StatList
      icon={<PlayArrow />}
      title="Currently Watching"
      content={recent}
      width={12}
      pictureWdith={2}
      labelComponent={statsCardLabelStatsCardLabelCurrentlyPlaying}
    />
  );
};

const statsCardLabelStatsCardLabelCurrentlyPlaying = (season: Season) => [
  [`S ${season.s}`, season.startDate?.toLocaleDateString() || ""],
];

export default Stats;
