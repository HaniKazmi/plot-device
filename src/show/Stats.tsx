import { AutoGraph, Pause, PlayArrow, ShowChart, TaskAlt, Timer, Update } from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { Season, Show, Status } from "./types";
import { StatCard, StatList, StatsListProps, TotalStack } from "../common/Stats";
import ShowCardMediaImage from "./CardMediaImage";
import { statusToColour } from "../utils/types";
import { Stack } from "@mui/material";
import type { ReactNode } from "react";
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
      <StatSummary
        icon={<Timer />}
        title="All Time"
        stats={allTimeTotals(data)}
      />
      <StatSummary
        icon={<Update />}
        title={`In ${CURRENT_YEAR}`}
        stats={seasonsInYear(data, CURRENT_YEAR)}
      />
      <StatSummary
        icon={<ShowChart />}
        title="Yearly Average"
        stats={yearlyAverages(data)}
      />
      <StatSummary
        icon={<AutoGraph />}
        title="Show Average"
        stats={perShowAverages(data)}
      />
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

/** Each `statsData` total is already keyed by the label it renders under, in display order. */
const StatSummary = ({ icon, title, stats }: { icon: ReactNode; title: string; stats: Record<string, number> }) => (
  <StatCard
    icon={icon}
    title={title}
    content={Object.entries(stats).map(([key, value]) => [key[0].toUpperCase() + key.slice(1), value])}
  />
);

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
      chipComponent={({ e }) => ({ label: `E ${e}` })}
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
