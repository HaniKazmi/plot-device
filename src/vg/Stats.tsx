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
import Grid from "@mui/material/Unstable_Grid2";
import { prepareForSlot } from "@mui/base/utils";
import { CURRENT_YEAR } from "../utils/dateUtils";
import { format } from "../utils/mathUtils";
import { Company, Measure, Status, VideoGame, companyToColor, platformToShort, statusToColour } from "./types";
import { StatCard, StatList, StatsListProps } from "../common/Stats";
import VgCardMediaImage from "./CardMediaImage";
import { Box, Card, CardContent, CardHeader, FormControl, MenuItem, Select, Stack, Typography } from "@mui/material";
import { ReactNode } from "react";
import { FilterDispatch } from "./filterUtils";

const Stats = ({
  data,
  measure,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  measure: Measure;
  yearTo: number;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <AllTime data={data} yearTo={yearTo} filterDispatch={filterDispatch} />
      <ThisYearSoFar data={data} />
      <Averages data={data} />
      <AveragesPerGame data={data} />
      <Totals data={data} measure={measure} />
      <CurrentlyPlaying data={data} />
      <MostPlayed data={data} />
      <RecentlyComplete data={data} />
    </Grid>
  );
};

const Segment = ({
  percent,
  backgroundColour,
  spacing = 2,
}: {
  percent: number;
  backgroundColour: string;
  spacing?: number;
}) => (
  <Box
    sx={{
      width: `${percent}%`,
      height: (theme) => theme.spacing(spacing),
      backgroundColor: backgroundColour,
    }}
  />
);

const TotalStack = <T extends string>({
  title,
  data,
  measure,
  groupKey,
  group,
  groupToColour,
  icon,
}: {
  title: string;
  data: VideoGame[];
  measure: Measure;
  groupKey: keyof VideoGame;
  group: T[];
  groupToColour: (ele: T) => string;
  icon: ReactNode;
}) => {
  const total = measure === "Count" ? data.length : data.sum("hours");
  let percentLeft = 100;

  const totals = group
    .map((e) => {
      const count =
        measure === "Count"
          ? data.filter((vg) => vg[groupKey] === e).length
          : data.filter((vg) => vg[groupKey] === e).sum("hours");
      const percent = Math.max((count / total) * 100, 0.5);
      percentLeft -= percent;
      return {
        name: e,
        count,
        percent,
        colour: groupToColour(e),
      };
    })
    .filter((struct) => struct.count > 0);

  totals[0].percent += percentLeft;

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
      <CardContent
        sx={{
          ":last-child": { paddingBottom: 1 },
          height: "100%",
        }}
      >
        <Stack direction="row" alignItems="center" height={(theme) => theme.spacing(3)} spacing={0.5}>
          {totals.map((struct) => (
            <Segment key={struct.name} percent={struct.percent} backgroundColour={struct.colour} />
          ))}
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center">
          {totals.map((struct) => (
            <Stack key={struct.name} direction="column" width="100%">
              <Segment percent={100} backgroundColour={struct.colour} spacing={1} />
              <Typography variant="h6">{struct.name}</Typography>
              <Typography variant="body1">{`${struct.count} ${measure === "Count" ? "Games" : "Hours"}`}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};

const Totals = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const statusList: Status[] = ["Beat", "Playing", "Endless", "Abandoned"];
  const companyList: Company[] = ["Nintendo", "PlayStation", "PC", "iOS", "Xbox"];
  return (
    <Grid xs={12} sm={12} md={8}>
      <Stack justifyContent="space-between" height="100%" spacing={1}>
        <TotalStack
          title={"Status"}
          icon={<TaskAlt />}
          data={data}
          measure={measure}
          groupKey="status"
          group={statusList}
          groupToColour={(ele: Status) => statusToColour({ status: ele })}
        />
        <TotalStack
          title={"Platforms"}
          icon={<VideogameAsset />}
          data={data}
          measure={measure}
          groupKey="company"
          group={companyList}
          groupToColour={(ele: Company) => companyToColor({ company: ele })}
        />
      </Stack>
    </Grid>
  );
};

const AllTime = ({
  data,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  yearTo: number;
  filterDispatch: FilterDispatch;
}) => {
  const filtered = data.filter((game) => game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;
  const earliestYear = data.sortByKey("startDate").at(-1)!.startDate.getFullYear();

  const titleSelect = (
    <FormControl variant="standard" sx={{ minWidth: 120, margin: 0 }}>
      <Select
        SelectDisplayProps={{ style: { padding: 0 } }}
        value={yearTo}
        label="Age"
        displayEmpty
        onChange={(event) =>
          filterDispatch({ type: "updateFilter", filter: "yearTo", value: event.target.value as number })
        }
        renderValue={(value) => <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : value}</Typography>}
        slots={{ root: prepareForSlot("span") }}
      >
        {Array.from({ length: CURRENT_YEAR - earliestYear + 1 }, (_, i) => CURRENT_YEAR - i).map((year) => (
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
      content={[
        ["Games", games],
        ["Hours", time],
      ]}
    />
  );
};

const Averages = ({ data }: { data: VideoGame[] }) => {
  const grouped = data.reduce<Record<string, [number, number]>>((tree, game) => {
    const year = game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;
    tree[year] ??= [0, 0];
    tree[year] = [tree[year][0] + 1, tree[year][1] + game.hours];
    return tree;
  }, {});

  const games = parseFloat((Object.values(grouped).sum(0) / Object.keys(grouped).length).toFixed(2));
  const hours = parseFloat((Object.values(grouped).sum(1) / Object.keys(grouped).length).toFixed(2));

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

const ThisYearSoFar = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.startDate?.getFullYear() === CURRENT_YEAR && game.hours);
  const time = filtered.sum("hours");
  const games = filtered.length;

  return (
    <StatCard
      icon={<Update />}
      title={`In ${CURRENT_YEAR}`}
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
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sortByKey("hours")
    .slice(0, 6);
  return (
    <VgStatList icon={<Whatshot />} title="Most Played" content={most} labelComponent={StatsCardLabelEndDateHours} />
  );
};

const CurrentlyPlaying = ({ data }: { data: VideoGame[] }) => {
  const recent = data.filter((a) => a.status === "Playing").sortByKey("startDate");
  if (recent.length == 0) return null;
  return (
    <VgStatList
      icon={<PlayArrow />}
      title="Currently Playing"
      content={recent}
      labelComponent={StatsCardLabelStartDate}
      width={[12, 12, 4]}
      pictureWidth={[12, 4, 12]}
    />
  );
};

const StatsCardLabelEndDateHours = (game: VideoGame) => [
  [game.endDate?.toLocaleDateString() ?? "", `${format(game.hours!)} Hours`],
];

const StatsCardLabelStartDate = (game: VideoGame) => [[game.startDate?.toLocaleDateString() ?? ""]];

const VgStatList = (
  props: Omit<StatsListProps<VideoGame>, "MediaComponent" | "aspectRatio" | "divider" | "chipComponent" | "landscape">,
) => (
  <StatList
    aspectRatio="16/9"
    divider
    chipComponent={platformToShort}
    landscape
    MediaComponent={VgCardMediaImage}
    {...props}
  />
);

export default Stats;
