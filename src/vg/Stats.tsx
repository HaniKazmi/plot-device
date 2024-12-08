import {
  AutoGraph,
  Pause,
  PlayArrow,
  ShowChart,
  TaskAlt,
  Timer,
  Update,
  VideogameAsset,
  Whatshot,
} from "@mui/icons-material";
import Grid from "@mui/material/Grid2";
import { format } from "../utils/mathUtils";
import { companyToColor, platformToShort, type Company, type Measure, type Status, type VideoGame } from "./types";
import { StatCard, StatList, type StatsListProps, TotalStack } from "../common/Stats";
import VgCardMediaImage from "./CardMediaImage";
import { FormControl, MenuItem, Radio, Select, Stack, Typography } from "@mui/material";
import type { FilterDispatch, YearType } from "./filterUtils";
import { statusToColour } from "../utils/types";
import { CURRENT_YEAR, EARLIEST_YEAR, YearNumber } from "../common/date";
import { ComponentProps, createElement, ElementType, forwardRef } from "react";

const Stats = ({
  data,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <AllTime data={data} yearTo={yearTo} yearType={yearType} filterDispatch={filterDispatch} />
      <ThisYearSoFar data={data} yearTo={yearTo} yearType={yearType} filterDispatch={filterDispatch} />
      <Averages data={data} yearType={yearType} />
      <AveragesPerGame data={data} />
      <Totals data={data} measure={measure} />
      <CurrentlyPlaying data={data} />
      <MostPlayed data={data} />
      <RecentlyComplete data={data} />
    </Grid>
  );
};

const Totals = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const statusList: Status[] = ["Beat", "Playing", "Endless", "Abandoned"];
  const companyList: Company[] = ["Nintendo", "PlayStation", "PC", "iOS", "Xbox"];
  const measureFunc = (data: VideoGame[]) => (measure == "Games" ? data.length : data.sum("hours"));
  return (
    <Grid
      size={{
        xs: 12,
        sm: 12,
        md: 8,
      }}
    >
      <Stack justifyContent="space-between" height="100%" spacing={1}>
        <TotalStack
          title={"Status"}
          icon={<TaskAlt />}
          data={data}
          measureFunc={measureFunc}
          groupKey="status"
          group={statusList}
          groupToColour={(ele: Status) => statusToColour({ status: ele })}
          measureLabel={measure}
        />
        <TotalStack
          title={"Platforms"}
          icon={<VideogameAsset />}
          data={data}
          measureFunc={measureFunc}
          groupKey="company"
          group={companyList}
          groupToColour={(ele: Company) => companyToColor({ company: ele })}
          measureLabel={measure === "Games" ? "Games" : "Hours"}
        />
      </Stack>
    </Grid>
  );
};

const AllTime = ({
  data,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  yearType: YearType;
  yearTo: number;
  filterDispatch: FilterDispatch;
}) => {
  const filtered = data.filter((game) => game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;
  const titleSelect = (
    <FormControl variant="standard" sx={{ minWidth: 130, margin: 0 }}>
      <Select
        SelectDisplayProps={{ style: { padding: 0 } }}
        value={yearTo}
        displayEmpty
        onChange={(event) =>
          filterDispatch({ type: "updateFilter", filter: "yearTo", value: event.target.value as YearNumber })
        }
        renderValue={(value) => (
          <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
        )}
        slots={{ root: prepareForSlot("span") }}
      >
        {Array.from({ length: CURRENT_YEAR - EARLIEST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i).map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <StatCard
      icon={<Timer />}
      title={titleSelect}
      action={
        <Radio size="small" checked={yearType == "upto"} onChange={() => filterDispatch({ type: "toggleYearType" })} />
      }
      content={[
        ["Games", games],
        ["Hours", time],
      ]}
    />
  );
};

const ThisYearSoFar = ({
  data,
  yearTo,
  yearType,
  filterDispatch,
}: {
  data: VideoGame[];
  yearTo: number;
  yearType: YearType;
  filterDispatch: FilterDispatch;
}) => {
  const filtered = data.filter((game) => game.startDate.year === yearTo && game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;

  const titleSelect = (
    <FormControl variant="standard" sx={{ minWidth: 120, margin: 0 }}>
      <Select
        SelectDisplayProps={{ style: { padding: 0 } }}
        value={yearTo}
        displayEmpty
        onChange={(event) =>
          filterDispatch({ type: "updateFilter", filter: "yearTo", value: event.target.value as YearNumber })
        }
        renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
        slots={{ root: prepareForSlot("span") }}
      >
        {Array.from({ length: CURRENT_YEAR - EARLIEST_YEAR + 1 }, (_, i) => CURRENT_YEAR - i).map((year) => (
          <MenuItem key={year} value={year}>
            {year}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );

  return (
    <StatCard
      icon={<Update />}
      title={titleSelect}
      action={
        <Radio
          size="small"
          checked={yearType == "matching"}
          onChange={() => filterDispatch({ type: "toggleYearType" })}
        />
      }
      content={[
        ["Games", games],
        ["Hours", time],
      ]}
    />
  );
};

const Averages = ({ data, yearType }: { data: VideoGame[]; yearType: YearType }) => {
  if (yearType == "matching") return;
  const grouped = data.reduce<Record<YearNumber, { games: number; hours: number }>>((tree, game) => {
    if (!game.hours) return tree;
    const gamesAndHours = (tree[game.startDate.year] ??= { games: 0, hours: 0 });
    gamesAndHours.games += 1;
    gamesAndHours.hours += game.hours;
    return tree;
  }, {});

  const games = parseFloat((Object.values(grouped).sum("games") / Object.keys(grouped).length).toFixed(2));
  const hours = parseFloat((Object.values(grouped).sum("hours") / Object.keys(grouped).length).toFixed(2));

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
  const filtered = data.filter((game) => game.status === "Beat" && game.hours && game.numDays);
  const hours = Math.round(filtered.sum("hours") / filtered.length);
  const days = Math.round(filtered.sum("numDays") / filtered.length);

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
    .sortByKey("endDate")
    .slice(0, 6);
  return (
    <VgStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      labelComponent={StatsCardLabelEndDateHours}
    />
  );
};

const MostPlayed = ({ data }: { data: VideoGame[] }) => {
  const most = data
    .filter((a) => a.hours && a.endDate)
    .sortByKey("hours")
    .slice(0, 6);
  return (
    <VgStatList icon={<Whatshot />} title="Most Played" content={most} labelComponent={StatsCardLabelEndDateHours} />
  );
};

const CurrentlyPlaying = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter((a) => a.status === "Playing")
    .sortByKey("startDate")
    .reverse();
  if (recent.length == 0) return null;
  return (
    <VgStatList
      icon={<PlayArrow />}
      title="Currently Playing"
      content={recent}
      labelComponent={StatsCardLabelStartDate}
      width={[12, 12, 4]}
      pictureWidth={[12, 4, 12]}
      wrap={false}
    />
  );
};

const StatsCardLabelEndDateHours = (game: VideoGame) => [
  [game.endDate?.toString() ?? "", `${format(game.hours!)} Hours`],
];

const StatsCardLabelStartDate = (game: VideoGame) => [[game.startDate?.toString() ?? ""]];

const VgStatList = (
  props: Omit<
    StatsListProps<VideoGame>,
    "MediaComponent" | "aspectRatio" | "divider" | "chipComponent" | "landscape" | "nameComponent"
  >,
) => (
  <StatList
    aspectRatio="16/9"
    divider
    chipComponent={platformToShort}
    landscape
    MediaComponent={VgCardMediaImage}
    nameComponent={(entry) => entry.name}
    {...props}
  />
);

export default Stats;

function prepareForSlot<ComponentType extends ElementType>(Component: ComponentType) {
  type Props = ComponentProps<ComponentType>;

  return forwardRef<HTMLElement, Props>(function Slot(props, ref) {
    const { ownerState, ...other } = props;
    return createElement<Props>(Component, {
      ...(other as Props),
      ref,
    });
  });
}
