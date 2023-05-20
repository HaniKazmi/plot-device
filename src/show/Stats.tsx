import { AutoGraph, Pause, PlayArrow, ShowChart, Timer, Update } from "@mui/icons-material";
import { Card, CardContent, CardHeader, CardMedia, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { CURRENT_YEAR } from "../utils/dateUtils";
import { format } from "../utils/mathUtils";
import { StatCard } from "../vg/Stats";
import { Season, Show } from "./types";

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
  const totalEpisodes = data.sum('e');
  const totalTime = Math.floor(data.sum('minutes') / 60)
  return <StatCard icon={<Timer />} title="All Time" content={[["Shows", totalShows], ["Episodes", totalEpisodes], ["Hours", totalTime]]} />;
};

const ThisYearSoFar = ({ data }: { data: Show[] }) => {
  const filtered = data.flatMap(show => show.s).filter(s => s.startDate.getFullYear() === CURRENT_YEAR)
  const totalSeasons = filtered.length;
  const totalEpisodes = filtered.sum('e');
  const totalTime = Math.floor(filtered.sum('minutes') / 60)
  return <StatCard icon={<Update />} title="This Year So Far" content={[["Seasons", totalSeasons], ["Episodes", totalEpisodes], ["Hours", totalTime]]} />;
};

const Averages = ({ data }: { data: Show[] }) => {
  const grouped = data.flatMap(show => show.s).reduce((tree, s) => {
    let year = s.startDate.getFullYear().toString();
    if (!year || !s.minutes) return tree;

    if (!tree[year]) {
      tree[year] = [0, 0, 0]
    }
    tree[year] = [tree[year][0] + 1, tree[year][1] + s.e, tree[year][2] + s.minutes];
    return tree;
  }, {} as Record<string, [number, number, number]>);

  const seasons = Math.floor((Object.values(grouped).sum(0) / Object.keys(grouped).length))
  const episodes = Math.floor((Object.values(grouped).sum(1) / Object.keys(grouped).length))
  const hours = Math.floor((Object.values(grouped).sum(2) / Object.keys(grouped).length / 60))

  return <StatCard icon={<ShowChart />} title="Averages Per Year" content={[["Seasons", seasons], ["Episodes", episodes], ["Hours", hours]]} />;
};

const AveragesPerShow = ({ data }: { data: Show[] }) => {
  const filtered = data.flatMap(show => show.s)
  const totalSeasons = Math.round(filtered.length / data.length)
  const totalEpisodes = Math.round(filtered.sum('e') / data.length)
  const totalTime = Math.floor(filtered.sum('minutes') / 60 / data.length)

  return <StatCard icon={<AutoGraph />} title="Averages Per Show" content={[["Seasons", totalSeasons], ["Episodes", totalEpisodes], ["Hours", totalTime]]} />;
};

const RecentlyComplete = ({ data }: { data: Show[] }) => {
  const recent = data
    .flatMap(show => show.s.map(s => [show, s] as [Show, Season]))
    .filter(([, season]) => season.endDate)
    .sort(([, seasonA], [, seasonB]) => (seasonA.endDate! < seasonB.endDate! ? 1 : -1))
    .slice(0, 6);
  return <StatList icon={<Pause />} title="Recently Finished" content={recent} />;
};

const CurrentlyPlaying = ({ data }: { data: Show[] }) => {
  const recent = data
    .filter(show => show.status === 'Watching')
    .map(show => [show, show.s.at(-1)] as [Show, Season])
    .filter(([_, season]) => !season.endDate)
    .sort(([, seasonA], [, seasonB]) => (seasonA.startDate! < seasonB.startDate! ? 1 : -1))
    .slice(0, 6);
  return <StatList icon={<PlayArrow />} title="Currently Watching" content={recent} lastSeason={true} />;
};

const StatList = ({
  icon,
  title,
  content,
  lastSeason = false
}: {
  icon: JSX.Element & React.ReactNode,
  title: string,
  content: [Show, Season][],
  lastSeason?: boolean
}) => {
  return (
    <Grid xs={12} >
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} sx={{ paddingBottom: "0px" }} />
        <CardContent>
          <Grid container spacing={1} alignItems="center">
            {content.map(([show, season]) => (
              <Grid alignSelf="stretch" key={show.name} xs={lastSeason ? 2 : 2}>
                <Card variant="outlined">
                  <CardMedia
                    component="img"
                    src={show.banner}
                    width="100%"
                    alt={show.name} />
                  <CardContent sx={{ padding: "10px", ":last-child": { paddingBottom: "10px" } }}>
                    <Stack>
                      <Stack
                        justifyContent='space-between'
                        alignItems='baseline'
                        direction='row'
                      >
                        <Typography variant="subtitle2" color='text.secondary'>S {season.s}</Typography>
                        {lastSeason
                          ? <Typography variant="subtitle2" color='text.secondary'>{season.startDate?.toLocaleDateString()}</Typography>
                          : <Typography variant="subtitle2" color='text.secondary'>{season.endDate?.toLocaleDateString()}</Typography>
                        }
                      </Stack>
                      {!lastSeason
                        ?
                        <Stack
                          justifyContent='space-between'
                          alignItems='baseline'
                          direction='row'
                        >
                          <Typography variant="subtitle2" color='text.secondary'>{season.e} Eps</Typography>
                          <Typography variant="subtitle2" color='text.secondary'>{`${format(Math.round(season.minutes! / 60))} Hours`}</Typography>
                        </Stack>
                        : null
                      }
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

export default Stats;