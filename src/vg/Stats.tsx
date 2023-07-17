import { AutoGraph, Pause, PlayArrow, ShowChart, Timer, Update, Whatshot } from "@mui/icons-material";
import Grid from "@mui/material/Unstable_Grid2";
import { CURRENT_YEAR } from "../utils/dateUtils";
import { format } from "../utils/mathUtils";
import { VideoGame } from "./types";
import { StatCard, StatList } from "../common/Stats";

const Stats = ({ data }: { data: VideoGame[] }) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <AllTime data={data} />
      <ThisYearSoFar data={data} />
      <Averages data={data} />
      <AveragesPerGame data={data} />
      <MostPlayed data={data} />
      <RecentlyComplete data={data} />
      <CurrentlyPlaying data={data} />
    </Grid>
  );
};

const AllTime = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;
  return (
    <StatCard
      icon={<Timer />}
      title="All Time"
      content={[
        ["Games", games],
        ["Hours", time],
      ]}
    />
  );
};

const Averages = ({ data }: { data: VideoGame[] }) => {
  const grouped = data.reduce((tree, game) => {
    const year = game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    if (!tree[year]) {
      tree[year] = [0, 0];
    }
    tree[year] = [tree[year][0] + 1, tree[year][1] + game.hours];
    return tree;
  }, {} as Record<string, [number, number]>);

  const games = parseFloat((Object.values(grouped).sum(0) / Object.keys(grouped).length).toFixed(2));
  const hours = parseFloat((Object.values(grouped).sum(1) / Object.keys(grouped).length).toFixed(2));

  return (
    <StatCard
      icon={<ShowChart />}
      title="Averages Per Year"
      content={[
        ["Games", games],
        ["Hours", hours],
      ]}
    />
  );
};

const AveragesPerGame = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.status === "Beat" && game.hours && game.numDays);
  const hours = Math.round(filtered.sum("hours") / filtered.length);
  const days = Math.round(filtered.sum("numDays") / filtered.length);

  return (
    <StatCard
      icon={<AutoGraph />}
      title="Averages Per Game"
      content={[
        ["Hours", hours],
        ["Days To Beat", days],
      ]}
    />
  );
};

const ThisYearSoFar = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.startDate?.getFullYear() === CURRENT_YEAR && game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;

  return (
    <StatCard
      icon={<Update />}
      title="This Year So Far"
      content={[
        ["Games", games],
        ["Hours", time],
      ]}
    />
  );
};

const RecentlyComplete = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sortByKey("endDate")
    .slice(0, 6);
  return (
    <StatList
      icon={<Pause />}
      aspectRatio={"16/9"}
      divider
      title="Recently Finished"
      content={recent}
      labelComponent={StatsCardLabelMostPlayed}
    />
  );
};

const MostPlayed = ({ data }: { data: VideoGame[] }) => {
  const most = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sortByKey("hours")
    .slice(0, 6);
  return (
    <StatList
      icon={<Whatshot />}
      aspectRatio={"16/9"}
      divider
      title="Most Played"
      content={most}
      labelComponent={StatsCardLabelMostPlayed}
    />
  );
};

const CurrentlyPlaying = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter((a) => a.status === "Playing")
    .sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1))
    .slice(0, 3);
  return (
    <StatList
      icon={<PlayArrow />}
      aspectRatio={"16/9"}
      divider
      title="Currently Playing"
      content={recent}
      width={12}
      pictureWdith={4}
      labelComponent={StatsCardLabelCurrentlyPlaying}
    />
  );
};

const StatsCardLabelMostPlayed = (game: VideoGame) => [
  [game.endDate?.toLocaleDateString() || "", `${format(game.hours!)} Hours`],
];

const StatsCardLabelCurrentlyPlaying = (game: VideoGame) => [
  [game.startDate?.toLocaleDateString() || "", game.platform],
];

export default Stats;
