import {
  AutoGraph,
  Category,
  CloseFullscreen,
  ExpandCircleDown,
  Pause,
  PlayArrow,
  ShowChart,
  Stars,
  TaskAlt,
  Timer,
  Update,
  VideogameAsset,
  Whatshot,
} from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import {
  companyToColor,
  platformToShort,
  type Company,
  type Measure,
  type Status,
  type VideoGame,
  type VideoGameStringKeys,
} from "./types";
import { StatCard, StatList, StatsListCard, type StatsListProps, TotalStack } from "../common/Stats";
import VgCardMediaImage from "./CardMediaImage";
import {
  Avatar,
  CardContent,
  CardHeader,
  Dialog,
  FormControl,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Radio,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { FilterDispatch, YearType } from "./filterUtils";
import { statusToColour } from "../utils/types";
import { CURRENT_YEAR, EARLIEST_YEAR, YearNumber } from "../common/date";
import { ComponentProps, createElement, ElementType, forwardRef, useState, type ReactNode } from "react";
import { useSelectBox } from "../common/SelectBoxHook";

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
    <Grid
      container
      spacing={1}
      alignItems="stretch"
    >
      <AllTime
        data={data}
        yearTo={yearTo}
        yearType={yearType}
        filterDispatch={filterDispatch}
      />
      <ThisYearSoFar
        data={data}
        yearTo={yearTo}
        yearType={yearType}
        filterDispatch={filterDispatch}
      />
      <Averages
        data={data}
        yearType={yearType}
      />
      <AveragesPerGame data={data} />
      <Totals
        data={data}
        measure={measure}
      />
      <CurrentlyPlaying data={data} />
      <TopCategories
        data={data}
        measure={measure}
      />
      <MostPlayed
        data={data}
        measure={measure}
      />
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
      <Stack
        justifyContent="space-between"
        height="100%"
        spacing={1}
      >
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
    <FormControl
      variant="standard"
      sx={{ minWidth: 130, margin: 0 }}
    >
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
          <MenuItem
            key={year}
            value={year}
          >
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
        <Radio
          size="small"
          checked={yearType == "upto"}
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
    <FormControl
      variant="standard"
      sx={{ minWidth: 120, margin: 0 }}
    >
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
          <MenuItem
            key={year}
            value={year}
          >
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
    .slice(0, 18);
  return (
    <VgStatList
      icon={<Pause />}
      title="Recently Finished"
      content={recent}
      labelComponent={statsCardLabelEndDateHours}
    />
  );
};

const options: (VideoGameStringKeys | "game")[] = [
  "game",
  "company",
  "format",
  "franchise",
  "platform",
  "developer",
  "publisher",
  "rating",
  "status",
  "genre",
];

const MostPlayed = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(options, "game");

  if (option === "game") {
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
  const most = data
    .filter((a) => a.hours && a.endDate)
    .sortByKey("hours")
    .slice(0, 18);
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
  const gamesByCategory = Object.groupBy(
    data.filter((a) => a.hours && a.endDate),
    (vg) => vg[category],
  ) as Record<string, VideoGame[]>;

  const most = Object.entries(gamesByCategory)
    .map(([category, games]) => {
      return {
        category,
        total: measure === "Hours" ? games?.sum("hours") : games.length,
        most: games?.sortByKey("hours")[0],
        all: games,
      };
    })
    .sortByKey("total");

  const [dialogContent, setDialogContent] = useState<(typeof most)[number] | null>(null);

  const dialog = dialogContent ? (
    <Dialog
      open
      fullScreen
    >
      <CardHeader
        title={dialogContent.category}
        action={
          <IconButton onClick={() => setDialogContent(null)}>
            <CloseFullscreen color="primary" />
          </IconButton>
        }
        slotProps={{ title: { variant: "h6" } }}
      />
      <CardContent>
        <Grid
          container
          sx={{ overflow: "auto" }}
          spacing={1}
          alignItems="center"
        >
          {dialogContent.all.slice(0, 18).map((entry) => {
            return (
              <StatsListCard
                key={category + "-statslistcard-" + entry.name}
                item={entry}
                labels={statsCardLabelEndDateHours(entry)}
                chip={platformToShortChip(entry)}
                pictureWidth={vgStatListSharedProps.dialogPictureWidth}
                aspectRatio={vgStatListSharedProps.aspectRatio}
                MediaComponent={VgCardMediaImage}
              />
            );
          })}
        </Grid>
      </CardContent>
    </Dialog>
  ) : null;

  return (
    <>
      <StatList
        icon={<Whatshot />}
        controls={controls}
        title="Most Played"
        content={most}
        chipComponent={(entry) => ({
          icon: <ExpandCircleDown color="action" />,
          onClick: () => setDialogContent(entry),
        })}
        labelComponent={(item: (typeof most)[0]) => [[item.category, `${format(item.total!)} ${measure}`]]}
        MediaComponent={(props) => (
          <VgCardMediaImage
            {...props}
            item={props.item.most}
          />
        )}
        nameComponent={(entry) => entry.category}
        {...vgStatListSharedProps}
      />
      {dialog}
    </>
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
      labelComponent={statsCardLabelStartDate}
      wrap={false}
      width={[12, 12, 4]}
      pictureWidth={[12, 4, 12]}
    />
  );
};

const TopCategories = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  return (
    <>
      <TopList data={data} measure={measure} category="genre" title="Top Genres" icon={<Category />} />
      <TopList data={data} measure={measure} category="platform" title="Top Platforms" icon={<VideogameAsset />} />
      <TopList data={data} measure={measure} category="franchise" title="Top Franchises" icon={<Stars />} />
    </>
  );
};

const TopList = ({ data, measure, category, title, icon }: { data: VideoGame[]; measure: Measure; category: VideoGameStringKeys; title: string, icon: ReactNode }) => {
  const gamesByCategory = Object.groupBy(
    data.filter((a) => a.hours && a.endDate),
    (vg) => vg[category],
  ) as Record<string, VideoGame[]>;

  const most = Object.entries(gamesByCategory)
    .filter(([cat]) => cat && cat !== "undefined" && cat !== "")
    .map(([cat, games]) => {
      return {
        category: cat,
        total: measure === "Hours" ? games?.sum("hours") : games.length,
      };
    })
    .sortByKey("total")
    .slice(0, 5);

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card sx={{ height: "100%" }}>
        <CardHeader
          title={title}
          avatar={icon}
          titleTypographyProps={{ variant: "h6" }}
          sx={{ paddingBottom: "5px" }}
        />
        <CardContent sx={{ padding: 0 }}>
          <List dense>
            {most.map((item, index) => (
              <ListItem key={item.category}>
                <ListItemAvatar sx={{ minWidth: 40 }}>
                  <Avatar sx={{ width: 24, height: 24, fontSize: '0.875rem' }}>{index + 1}</Avatar>
                </ListItemAvatar>
                <ListItemText primary={item.category} secondary={`${format(item.total!)} ${measure}`} />
              </ListItem>
            ))}
          </List>
        </CardContent>
      </Card>
    </Grid>
  );
};

const statsCardLabelEndDateHours = (game: VideoGame) => [
  [game.endDate?.toString() ?? "", `${format(game.hours!)} Hours`],
];

const statsCardLabelStartDate = (game: VideoGame) => [[game.startDate?.toString() ?? ""]];

const VgStatList = (
  props: Omit<
    StatsListProps<VideoGame>,
    "MediaComponent" | "chipComponent" | "nameComponent" | "controls" | keyof typeof vgStatListSharedProps
  > &
    Partial<Pick<StatsListProps<VideoGame>, "width" | "pictureWidth" | "controls">>,
) => (
  <StatList
    chipComponent={platformToShortChip}
    MediaComponent={VgCardMediaImage}
    nameComponent={(entry) => entry.name}
    {...vgStatListSharedProps}
    {...props}
  />
);

const platformToShortChip = (vg: VideoGame) => {
  const [label, colour] = platformToShort(vg);
  return { label, colour };
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
