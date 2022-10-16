import { Functions, Pause, PlayArrow, ShowChart, SkipNext, Timer, Update, Whatshot } from "@mui/icons-material";
import {
  Card,
  CardHeader,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  Divider,
  Stack,
  CardMedia,
} from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { Fragment } from "react";
import { VideoGame } from "./types";

const Stats = ({ data }: { data: VideoGame[] }) => {
  return (
    <Grid container spacing={1} alignItems="stretch">
      <TotalGames data={data} />
      <TotalTime data={data} />
      <ThisYearSoFar data={data} />
      <AverageTimePerGame data={data} />
      <MostPlayed data={data} />
      <RecentlyComplete data={data} />
      <CurrentlyPlaying data={data} />
    </Grid>
  );
};

const format = new Intl.NumberFormat().format;

const TotalTime = ({ data }: { data: VideoGame[] }) => {
  const total = format(data.filter((game) => game.hours).reduce((pre, cur) => pre + cur.hours!, 0));
  return <StatCard icon={<Timer />} title="Time Gamed" content={`${total} Hours`} />;
};

const TotalGames = ({ data }: { data: VideoGame[] }) => {
  const total = format(data.length);
  return <StatCard icon={<Functions />} title="Number of Games" content={total} />;
};

const AverageTimePerGame = ({ data }: { data: VideoGame[] }) => {
  const total = format(
    Math.round(data.filter((game) => game.hours).reduce((pre, cur) => pre + cur.hours!, 0) / data.length)
  );
  return <StatCard icon={<ShowChart />} title="Avg Time per Game" content={`${total} Hours`} />;
};

const ThisYearSoFar = ({ data }: { data: VideoGame[] }) => {
  const total = format(
    data
      .filter((game) => game.startDate?.getFullYear() === new Date().getFullYear() && game.hours)
      .reduce((pre, cur) => pre + cur.hours!, 0)
  );
  return <StatCard icon={<Update />} title="This Year So Far" content={`${total} Hours`} />;
};

const RecentlyComplete = ({ data }: { data: VideoGame[] }) => {
  const recent = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sort((a, b) => (a.endDate! < b.endDate! ? 1 : -1))
    .slice(0, 6);
  return <StatList icon={<Pause />} title="Recently Finished" content={recent} />;
};

const MostPlayed = ({ data }: { data: VideoGame[] }) => {
  const most = data
    .filter((a) => a.hours && a.startDate && a.endDate)
    .sort((a, b) => (a.hours! < b.hours! ? 1 : -1))
    .slice(0, 6);
  return <StatList icon={<Whatshot />} title="Most Played" content={most} />;
};

const CurrentlyPlaying = ({ data }: { data: VideoGame[] }) => {
  const recent = data.filter((a) => a.status === "Playing").sort((a, b) => (a.startDate! > b.startDate! ? 1 : -1))[0];
  return (
    <Grid xs={12} md={4}>
      <Stack direction="column" spacing={1} /* sx={{ height: "100%" }} */ >
        <Card sx={{ flex: "0 1 auto" }}>
          <CardHeader
            titleTypographyProps={{ variant: "h6" }}
            title="Currently Playing"
            subheader={`Started ${recent.startDate?.toLocaleDateString()}`}
            avatar={<PlayArrow />}
          />
          <CardMedia component="img" src="https://images.launchbox-app.com/455861bb-adee-48ad-88e9-19373db19a8e.jpg" />
        </Card>
        <Card sx={{ flex: "1 1 auto" }}>
          <CardHeader
            titleTypographyProps={{ variant: "h6" }}
            title="Next Up"
            subheader={`Releases ${new Date("11/10/2022").toLocaleDateString()}`}
            avatar={<SkipNext />}
          />
          <CardMedia component="img" src="https://images.launchbox-app.com/76ef597d-d0a3-4baa-ac5e-0f00da125e65.jpg" />
        </Card>
      </Stack>
    </Grid>
  );
};

const StatList = ({
  icon,
  title,
  content,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: VideoGame[];
}) => {
  return (
    <Grid xs={6} md={4}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <List>
            {content.map((game) => (
              <Fragment key={game.game}>
                <Divider variant="middle" component="li" />
                <ListItem>
                  <ListItemText
                    secondaryTypographyProps={{ component: "span" }}
                    primary={game.game}
                    secondary={
                      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between">
                        <Typography>{game.endDate?.toLocaleDateString()}</Typography>
                        <Typography>{`${format(game.hours!)} Hours`}</Typography>
                      </Stack>
                    }
                  />
                </ListItem>
              </Fragment>
            ))}
            <Divider variant="middle" component="li" />
          </List>
        </CardContent>
      </Card>
    </Grid>
  );
};

const StatCard = ({
  icon,
  title,
  content,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: string;
}) => {
  return (
    <Grid xs={6} md={3}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <Typography align="right" variant="h4">
            {content}
          </Typography>
        </CardContent>
      </Card>
    </Grid>
  );
};

export default Stats;
