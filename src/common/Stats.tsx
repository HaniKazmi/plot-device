import { Card, CardContent, CardHeader, Divider, Stack, Theme, Typography, useMediaQuery } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { format } from "../utils/mathUtils";
import { VideoGame } from "../vg/types";
import { Show } from "../show/types";
import { CardMediaImage } from "./Card";

export const StatCard = ({
  icon,
  title,
  content,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: string | [string, number][];
}) => {
  const formattedContent =
    typeof content === "string" ? (
      <Typography align="right" variant="h4">
        {content}
      </Typography>
    ) : (
      <Stack divider={<Divider orientation="vertical" flexItem />} justifyContent="space-evenly" direction={"row"}>
        {content.map(([key, val]) => (
          <Stack key={key} direction={"column"} flex="1 1 0">
            <Typography align="center" variant="h5">
              {format(val)}
            </Typography>
            <Typography align="center" sx={{ fontSize: 14 }} color="text.secondary">
              {key}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  return (
    <Grid xs={12} sm={6} md={3} >
      <Card sx={{ height: "100%" }}>
        <CardHeader
          titleTypographyProps={{ variant: "h6" }}
          title={title}
          avatar={icon}
          sx={{ paddingBottom: "5px" }}
        />
        <CardContent sx={{ paddingTop: "5px" }}>{formattedContent}</CardContent>
      </Card>
    </Grid>
  );
};

export const StatList = <T extends VideoGame | Show, U>({
  icon,
  title,
  content,
  labelComponent,
  chipComponent,
  width = [6, 12, 6],
  pictureWidth = [12, 4, 6],
  aspectRatio,
  divider,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: [T, U][] | T[];
  labelComponent: (u: U) => string[][];
  chipComponent?: (u: U) => [string, string];
  width?: [number, number, number];
  pictureWidth?: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
}) => {
  const dividerComponent = <Divider orientation="vertical" flexItem />;
  const matches = useMediaQuery<Theme>((theme) => theme.breakpoints.down('md'));
  if (matches) {
    content = content.slice(0, 3)
  }
  return (
    <Grid xs={width[0]} sm={width[1]} md={width[2]}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <Grid container spacing={1} alignItems="center">
            {content.map((entry) => {
              let game: T;
              let input: U;
              if (Array.isArray(entry)) {
                game = entry[0];
                input = entry[1];
              } else {
                game = entry;
                input = entry as unknown as U;
              }

              const chip = chipComponent && chipComponent(input);
              return (
                <Grid alignSelf="stretch" key={game.name} xs={pictureWidth[0]} sm={pictureWidth[1]} md={pictureWidth[2]} >
                  <Card variant="outlined" sx={{ height: "100%", bgcolor: chip && chip[1] + 80}}>
                    <CardMediaImage image={game.banner} width="100%" sx={{ aspectRatio }} alt={game.name} chip={chip} />
                    <CardContent sx={{ padding: "10px", ":last-child": { paddingBottom: "10px" } }}>
                      {labelComponent(input).map((stacks, index, labbels) => (
                        <Stack
                          key={`${title}-stacks-${game.name}-${index}`}
                          justifyContent="space-between"
                          alignItems="baseline"
                          direction="row"
                          divider={labbels.length === 1 || divider ? dividerComponent : null}
                        >
                          {stacks.map((val) => (
                            <Typography key={val} variant="subtitle2" color="text.secondary">
                              {val}
                            </Typography>
                          ))}
                        </Stack>
                      ))}
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
};
