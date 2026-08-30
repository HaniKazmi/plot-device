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
  heroStats,
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
import {
  EXPANDED_CARDS,
  StatCard,
  StatList,
  StatsListGrid,
  type StatsListProps,
  TotalsBand,
  VitalsCard,
} from "../common/Stats";
import { ProportionalBar } from "../common/Card";
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
import { CURRENT_PLAINDATE, CURRENT_YEAR, EARLIEST_YEAR, formatDate, YearNumber } from "../common/date";
import { Hero } from "../common/Hero";
import { Section } from "../common/SectionRail";
import { useFranchiseGames } from "./franchiseContext";
import { VG_SECTIONS } from "./sections";
import { useState, type ReactNode } from "react";
import prepareForSlot from "../utils/prepareForSlot";
import { useSelectBox } from "../common/SelectBoxHook";
import "../utils/arrayUtils";

const Stats = ({
  data,
  playing,
  measure,
  yearType,
  yearTo,
  filterDispatch,
}: {
  data: VideoGame[];
  /** Every game in progress, most recently started first. Computed by `Graphs`, which also
      decides on it whether the rail offers a chip pointing at the hero below. */
  playing: VideoGame[];
  measure: Measure;
  yearType: YearType;
  yearTo: YearNumber;
  filterDispatch: FilterDispatch;
}) => {
  return (
    <Stack spacing={2}>
      {/* No game in progress and there is no "now" to lead with. */}
      {playing.length > 0 && (
        <Section id={VG_SECTIONS.now}>
          <VgHero game={playing[0]} />
        </Section>
      )}
      <Section id={VG_SECTIONS.vitals}>
        <Grid
          container
          spacing={1}
          sx={{
            alignItems: "stretch",
          }}
        >
          {/* The year controls in these cards filter the whole page, and a control's effects flow
              down the page, never up — so the cards come before the bands they redraw. */}
          <YearTotals
            data={data}
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Timer />}
            activeYearType="upto"
            renderValue={(value) => (
              <Typography variant="h6">{value == CURRENT_YEAR ? "All Time" : `Up To ${value}`}</Typography>
            )}
          />
          <YearTotals
            data={data}
            yearTo={yearTo}
            yearType={yearType}
            filterDispatch={filterDispatch}
            icon={<Update />}
            activeYearType="matching"
            minWidth={120}
            matches={(game) => game.startDate.year === yearTo}
            renderValue={(value) => <Typography variant="h6">In {value}</Typography>}
          />
          <Averages
            data={data}
            yearType={yearType}
          />
          <AveragesPerGame data={data} />
          <Vitals
            data={data}
            measure={measure}
          />
        </Grid>
      </Section>
      <Section id={VG_SECTIONS.top}>
        <Grid
          container
          spacing={1}
          sx={{
            alignItems: "stretch",
          }}
        >
          <TopCategories
            data={data}
            measure={measure}
          />
        </Grid>
      </Section>
      <Section id={VG_SECTIONS.explore}>
        <Grid
          container
          spacing={1}
          sx={{
            alignItems: "stretch",
          }}
        >
          <MostPlayed
            data={data}
            measure={measure}
          />
          <RecentlyComplete data={data} />
          {/* Everything being played that the hero above is not already showing. */}
          <CurrentlyPlaying playing={playing.slice(1)} />
        </Grid>
      </Section>
    </Stack>
  );
};

/**
 * The franchise comes from the index the tab already built for the card strips rather than from
 * a second grouping of the same data, so the hero and the strip inside the card it opens cannot
 * come to disagree about how many games a series holds.
 */
const VgHero = ({ game }: { game: VideoGame }) => {
  const franchise = useFranchiseGames(game);

  return (
    <Hero
      item={game}
      MediaComponent={VgCardMediaImage}
      kicker={`Currently playing · since ${formatDate(game.startDate)}`}
      // The same badge every other playing game carries in the strip below, so being the one
      // promoted to the top of the page does not cost this game its platform.
      chip={platformToShortChip(game)}
      title={game.name}
      subtitle={[game.platform, game.genre].filter(Boolean).join(" · ")}
      stats={heroStats(game, franchise, CURRENT_PLAINDATE)}
    />
  );
};

/**
 * Status and platforms as one band rather than two cards.
 *
 * They answer the same question at the same altitude — what the library is made of — so they read
 * as one thing to scan past on the way to the charts. Two full cards spent most of a screen
 * saying it.
 */
const Vitals = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => {
  const statusList: Status[] = ["Beat", "Playing", "Endless", "Abandoned"];
  const companyList: Company[] = ["Nintendo", "PlayStation", "PC", "iOS", "Xbox"];
  const measureFunc = (data: VideoGame[]) => (measure == "Games" ? data.length : data.sum("hours"));

  return (
    <VitalsCard>
      <TotalsBand
        title={"Status"}
        icon={<TaskAlt />}
        data={data}
        measureFunc={measureFunc}
        groupKey="status"
        group={statusList}
        groupToColour={(ele: Status) => statusToColour({ status: ele })}
        measureLabel={measure}
      />
      <TotalsBand
        title={"Platforms"}
        icon={<VideogameAsset />}
        data={data}
        measureFunc={measureFunc}
        groupKey="company"
        group={companyList}
        groupToColour={(ele: Company) => companyToColor({ company: ele })}
        measureLabel={measure}
      />
    </VitalsCard>
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

/** The radio picks which of these two cards the year filter applies to, hence `activeYearType`. */
const YearTotals = ({
  data,
  yearType,
  yearTo,
  filterDispatch,
  icon,
  activeYearType,
  minWidth,
  matches,
  renderValue,
}: {
  data: VideoGame[];
  yearType: YearType;
  yearTo: number;
  filterDispatch: FilterDispatch;
  icon: ReactNode;
  activeYearType: YearType;
  minWidth?: number;
  matches?: (game: VideoGame) => boolean;
  renderValue: (value: number) => ReactNode;
}) => {
  const filtered = data.filter((game) => game.hours && (!matches || matches(game)));

  return (
    <StatCard
      icon={icon}
      title={
        <YearSelect
          yearTo={yearTo}
          filterDispatch={filterDispatch}
          minWidth={minWidth}
          renderValue={renderValue}
        />
      }
      action={
        <Radio
          size="small"
          checked={yearType == activeYearType}
          onChange={() => filterDispatch({ type: "toggleYearType" })}
        />
      }
      content={[
        ["Games", filtered.length],
        ["Hours", filtered.sum("hours")],
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
    .sortByKey("endDate");
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
  const most = data.filter((a) => a.hours && a.endDate).sortByKey("hours");
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
      <StatsListGrid
        // Sorted here rather than in `groupGamesBy`, which would sort every category on every
        // render to serve the one being drilled into. The cap below keeps only the first 18, so
        // an unsorted list would show an arbitrary handful under a card headed Most Played.
        content={dialogContent.all.sortByKey("hours")}
        limit={EXPANDED_CARDS}
        cardKey={(entry) => category + "-statslistcard-" + entry.name}
        labelComponent={statsCardLabelEndDateHours}
        chipComponent={platformToShortChip}
        pictureWidth={vgStatListSharedProps.dialogPictureWidth}
        aspectRatio={vgStatListSharedProps.aspectRatio}
        MediaComponent={VgCardMediaImage}
      />
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

const CurrentlyPlaying = ({ playing }: { playing: VideoGame[] }) => {
  if (playing.length == 0) return null;
  return (
    <VgStatList
      icon={<PlayArrow />}
      title="Also Playing"
      content={playing}
      labelComponent={statsCardLabelStartDate}
      wrap={false}
      width={[12, 12, 4]}
      pictureWidth={[12, 4, 12]}
    />
  );
};

const TopCategories = ({ data, measure }: { data: VideoGame[]; measure: Measure }) => (
  <>
    {(["genre", "publisher", "franchise"] as const).map((category) => (
      <TopList
        key={category}
        data={data}
        measure={measure}
        defaultCategory={category}
      />
    ))}
  </>
);

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

  const items = most.map((struct, index) => ({
    name: struct.name,
    percent: struct.percent,
    colour: getColour(struct, index),
  }));

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
          <ProportionalBar
            items={items}
            hovered={hovered}
            onHover={setHovered}
          />
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
                onMouseEnter={() => setHovered(struct.name)}
                onMouseLeave={() => setHovered(null)}
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

// The omitted props are the ones this wrapper supplies; `width` and `pictureWidth` come back as
// optional so a caller can override the shared default without being able to unset it.
const VgStatList = (
  props: Omit<
    StatsListProps<VideoGame>,
    "MediaComponent" | "chipComponent" | "nameComponent" | keyof typeof vgStatListSharedProps
  > &
    Partial<Pick<StatsListProps<VideoGame>, "width" | "pictureWidth">>,
) => (
  <StatList
    chipComponent={platformToShortChip}
    MediaComponent={VgCardMediaImage}
    nameComponent={(entry) => entry.name}
    {...vgStatListSharedProps}
    {...props}
  />
);

export default Stats;
