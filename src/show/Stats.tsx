import { AutoGraph, Pause, PlayArrow, ShowChart, TaskAlt, Timer, Update } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { Season, Show, Status } from "./types";
import { StatCard, StatList, StatsListProps, TotalStack } from "../common/Stats";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { Stack } from "@mui/material";
import { CURRENT_YEAR } from "../common/date";
import {
  allTimeTotals,
  currentlyWatching,
  perShowAverages,
  recentlyComplete,
  seasonsInYear,
  statsCardLabelCurrentlyPlaying,
  statsCardLabelRecentlyComplete,
  yearlyAverages,
} from "./statsData";

const Stats = ({ data }: { data: Show[] }) => {
  return (
    <Grid
      container
      spacing={1}
      sx={{
        alignItems: "stretch",
      }}
    >
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
    <Grid size={12}>
      <Stack
        spacing={1}
        sx={{
          justifyContent: "space-between",
          height: "100%",
        }}
      >
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
  const { shows: totalShows, episodes: totalEpisodes, hours: totalTime } = allTimeTotals(data);
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
  const { seasons: totalSeasons, episodes: totalEpisodes, hours: totalTime } = seasonsInYear(data, CURRENT_YEAR);
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
  const { seasons, episodes, hours } = yearlyAverages(data);

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
  const { seasons: totalSeasons, episodes: totalEpisodes, hours: totalTime } = perShowAverages(data);

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

const CurrentlyPlaying = ({ data }: { data: Show[] }) => {
  const recent = currentlyWatching(data);
  return (
    <ShowStatList
      icon={<PlayArrow />}
      title="Currently Watching"
      content={recent}
      wrap={false}
      labelComponent={statsCardLabelCurrentlyPlaying}
    />
  );
};

const ShowStatList = (
  props: Omit<
    StatsListProps<Season>,
    "MediaComponent" | "nameComponent" | "width" | "pictureWidth" | "dialogPictureWidth"
  >,
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

export default Stats;
