import { AutoGraph, Pause, PlayArrow, ShowChart, Timer, Update, Whatshot } from "@mui/icons-material";
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  Divider,
  Stack,
  CardMedia,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { CURRENT_YEAR } from "../utils/dateUtils";
import { format } from "../utils/mathUtils";
import { VideoGame } from "./types";

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
  const time = filtered.sum('hours');
  const games = filtered.length;
  return <StatCard icon={<Timer />} title="All Time" content={[["Games", games], ["Hours", time]]} />;
};

const Averages = ({ data }: { data: VideoGame[] }) => {
  const grouped = data.reduce((tree, game) => {
    let year = game.startDate?.getFullYear().toString();
    if (!year || !game.hours) return tree;

    if (!tree[year]) {
      tree[year] = [0, 0]
    }
    tree[year] = [tree[year][0] + 1, tree[year][1] + game.hours];
    return tree;
  }, {} as Record<string, [number, number]>);

  const games = parseFloat((Object.values(grouped).sum(0) / Object.keys(grouped).length).toFixed(2))
  const hours = parseFloat((Object.values(grouped).sum(1) / Object.keys(grouped).length).toFixed(2))

  return <StatCard icon={<ShowChart />} title="Averages Per Year" content={[["Games", games], ["Hours", hours]]} />;
};

const AveragesPerGame = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.status === 'Beat' && game.hours && game.numDays)
  const hours = Math.round(filtered.sum('hours') / filtered.length)
  const days = Math.round(filtered.sum('numDays') / filtered.length)

  return <StatCard icon={<AutoGraph />} title="Averages Per Game" content={[["Hours", hours], ["Days To Beat", days]]} />;
};

const ThisYearSoFar = ({ data }: { data: VideoGame[] }) => {
  const filtered = data.filter((game) => game.startDate?.getFullYear() === CURRENT_YEAR && game.hours);
  const time = filtered.sum('hours');
  const games = filtered.length;

  return <StatCard icon={<Update />} title="This Year So Far" content={[["Games", games], ["Hours", time]]} />;
};

const RecentlyComplete = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sortByKey('endDate')
    .slice(0, 6);
  return <StatList icon={<Pause />} title="Recently Finished" content={recent} />;
};

const MostPlayed = ({ data }: { data: VideoGame[] }) => {
  const most = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sortByKey('hours')
    .slice(0, 6);
  return <StatList icon={<Whatshot />} title="Most Played" content={most} />;
};

const CurrentlyPlaying = ({ data }: { data: VideoGame[] }) => {
  const recent = data.filter((a) => a.status === "Playing").sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1)).slice(0, 3);
  return <StatList icon={<PlayArrow />} title="Currently Playing" content={recent} width={12} pictureWdith={4} endDate={false} />;
};

const StatList = ({
  icon,
  title,
  content,
  width = 6,
  pictureWdith = 6,
  endDate = true,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: VideoGame[];
  width?: number;
  pictureWdith?: number;
  endDate?: boolean;
}) => {
  return (
    <Grid xs={width}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <Grid container spacing={1} alignItems="center">
            {content.map(game => (
              <Grid alignSelf="stretch" key={game.name} xs={pictureWdith}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardMedia
                    component="img"
                    src={game.banner}
                    width="100%"
                    sx={{ aspectRatio: '16/9' }}
                    alt={game.name} />
                  <CardContent sx={{ padding: "10px", ":last-child": { paddingBottom: "10px" } }}>
                    <Stack
                      justifyContent='space-between'
                      alignItems='baseline'
                      direction='row'
                      divider={<Divider orientation="vertical" flexItem />} >
                      {endDate ? [
                        <Typography key={game + "endDate"}>{game.endDate?.toLocaleDateString()}</Typography>,
                        <Typography key={game + "hours"}>{`${format(game.hours!)} Hours`}</Typography>
                      ]
                        :
                        [
                          <Typography key={game + "startDate"}>{game.startDate?.toLocaleDateString()}</Typography>,
                          <Typography key={game + "platform"}>{game.platform}</Typography>
                        ]}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
};

export const StatCard = ({
  icon,
  title,
  content,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: string | [string, number][]
}) => {
  const formattedContent = typeof content === 'string' ?
    <Typography align="right" variant="h4">
      {content}
    </Typography>
    : <Stack
      divider={<Divider orientation="vertical" flexItem />}
      justifyContent="space-evenly" direction={"row"}>
      {content.map(([key, val]) => (
        <Stack key={val} direction={"column"}>
          <Typography align="center" variant="h5">
            {format(val)}
          </Typography>
          <Typography align="center" sx={{ fontSize: 14 }} color="text.secondary">
            {key}
          </Typography>
        </Stack>
      )
      )}</Stack>;
  return (
    <Grid xs={12} md={3}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon}
          sx={{ paddingBottom: "5px" }} />
        <CardContent sx={{ paddingTop: "5px" }}>
          {formattedContent}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default Stats;
