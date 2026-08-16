import {
  Album,
  AutoGraph,
  Business,
  Category,
  CloseFullscreen,
  Code,
  ExpandCircleDown,
  Pause,
  PlayArrow,
  ShowChart,
  Stars,
  Storefront,
  TaskAlt,
  Timer,
  Update,
  VerifiedUser,
  VideogameAsset,
  Whatshot,
} from "@mui/icons-material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import {
  groupGamesBy,
  perGameAverages,
  platformToShortChip,
  statsCardLabelEndDateHours,
  statsCardLabelStartDate,
  topNWithOther,
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
import { Segment, StatCard, StatList, StatsListCard, type StatsListProps, TotalStack } from "../common/Stats";
import { highchartsColors } from "../highcharts";
import VgCardMediaImage from "./CardMediaImage";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  FormControl,
  IconButton,
  MenuItem,
  Radio,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { FilterDispatch, YearType } from "./filterUtils";
import { statusToColour } from "../utils/types";
import { CURRENT_YEAR, EARLIEST_YEAR, YearNumber } from "../common/date";
import { useState, type ReactNode } from "react";
import prepareForSlot from "../utils/prepareForSlot";
import { useSelectBox } from "../common/SelectBoxHook";
import "../utils/arrayUtils";

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
      sx={{
        alignItems: "stretch",
      }}
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

const YearSelect = ({
  yearTo,
  filterDispatch,
  renderValue,
  minWidth = 130,
}: {
  yearTo: number;
  filterDispatch: FilterDispatch;
  renderValue: (value: number) => ReactNode;
  minWidth?: number;
}) => (
  <FormControl
    variant="standard"
    sx={{ minWidth, margin: 0 }}
  >
    <Select
      SelectDisplayProps={{ style: { padding: 0 } }}
      value={yearTo}
      displayEmpty
      onChange={(event) =>
        filterDispatch({ type: "updateFilter", filter: "yearTo", value: event.target.value as YearNumber })
      }
      renderValue={(value) => renderValue(value as number)}
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

  return (
    <StatCard
      icon={<Timer />}
      title={
        <YearSelect
          yearTo={yearTo}
          filterDispatch={filterDispatch}
          renderValue={(value) => (
            <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
          )}
        />
      }
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

  return (
    <StatCard
      icon={<Update />}
      title={
        <YearSelect
          yearTo={yearTo}
          filterDispatch={filterDispatch}
          minWidth={120}
          renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
        />
      }
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
  const { games, hours } = yearlyAverages(data);

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
  const { hours, days } = perGameAverages(data);

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

const MostPlayed = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const [option, controls] = useSelectBox(videoGameOptions, "name");

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
  const most = groupGamesBy(data, category, measure);

  const [dialogContent, setDialogContent] = useState<(typeof most)[number] | null>(null);

  const dialog = dialogContent ? (
    <Dialog
      open
      fullScreen
    >
      <CardHeader
        title={dialogContent.name}
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
          spacing={1}
          sx={{
            alignItems: "center",
            overflow: "auto",
          }}
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
        labelComponent={(item: (typeof most)[0]) => [[item.name, `${format(item.count)} ${measure}`]]}
        MediaComponent={(props) => (
          <VgCardMediaImage
            {...props}
            item={props.item.top}
            colour={groupToColour(category, props.item.top)}
          />
        )}
        nameComponent={(entry) => entry.name}
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
      <TopList
        data={data}
        measure={measure}
        defaultCategory="genre"
      />
      <TopList
        data={data}
        measure={measure}
        defaultCategory="publisher"
      />
      <TopList
        data={data}
        measure={measure}
        defaultCategory="franchise"
      />
    </>
  );
};

const optionIcons: Record<TopOption, ReactNode> = {
  company: <Business />,
  format: <Album />,
  franchise: <Stars />,
  platform: <VideogameAsset />,
  developer: <Code />,
  publisher: <Storefront />,
  rating: <VerifiedUser />,
  status: <TaskAlt />,
  genre: <Category />,
};

const TopList = ({
  data,
  measure,
  defaultCategory,
}: {
  data: VideoGame[];
  measure: Measure;
  defaultCategory: TopOption;
}) => {
  const [option, controls] = useSelectBox(topOptions, defaultCategory);
  const colorOffset = topOptions.indexOf(option) * 3;
  const [hovered, setHovered] = useState<string | null>(null);

  const most = topNWithOther(data, option, measure);

  const getColour = (struct: (typeof most)[0], index: number) => {
    if (struct.name === "Other") return "grey";
    const groupCol = struct.top ? groupToColour(option, struct.top) : "";
    return groupCol || highchartsColors[(index + colorOffset) % highchartsColors.length];
  };

  return (
    <Grid size={{ xs: 12, sm: 6, md: 4 }}>
      <Card sx={{ height: "100%" }}>
        <CardHeader
          title={`Top ${option}`}
          avatar={optionIcons[option]}
          action={controls}
          slotProps={{
            title: { variant: "h6", sx: { textTransform: "capitalize" } },
          }}
        />
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 1 },
            height: "100%",
          }}
        >
          <Stack
            direction="row"
            spacing={0.25}
            sx={{
              alignItems: "center",
              height: (theme) => theme.spacing(3),
            }}
          >
            {most.map((struct, index) => (
              <Segment
                key={`top-${struct.name}`}
                percent={struct.percent}
                backgroundColour={getColour(struct, index)}
                onMouseEnter={() => setHovered(struct.name)}
                onMouseLeave={() => setHovered(null)}
                sx={{
                  opacity: hovered && hovered !== struct.name ? 0.3 : 1,
                  cursor: "pointer",
                }}
              />
            ))}
          </Stack>
          <Stack
            direction="column"
            spacing={1}
            sx={{
              alignItems: "stretch",
              mt: 2,
            }}
          >
            {most.map((struct, index) => (
              <Stack
                key={`col-${struct.name}`}
                direction="row"
                spacing={1}
                sx={{
                  width: "100%",
                  alignItems: "center",
                  opacity: hovered && hovered !== struct.name ? 0.3 : 1,
                  transition: "opacity 0.2s",
                  cursor: "default",
                }}
              >
                <Box
                  sx={{
                    width: 16,
                    height: 16,
                    backgroundColor: getColour(struct, index),
                    borderRadius: 0.5,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  onMouseEnter={() => setHovered(struct.name)}
                  onMouseLeave={() => setHovered(null)}
                  variant="body2"
                  sx={{ flexGrow: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                >
                  {struct.name}
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ flexShrink: 0 }}
                >
                  {`${format(struct.count)} ${measure}`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

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
