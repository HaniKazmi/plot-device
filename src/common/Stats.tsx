import { Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
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
          <Stack key={val} direction={"column"}>
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
    <Grid xs={12} md={3}>
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
  width = 6,
  pictureWdith = 6,
  aspectRatio,
  divider,
}: {
  icon: JSX.Element & React.ReactNode;
  title: string;
  content: [T, U][] | T[];
  labelComponent: (u: U) => string[][];
  width?: number;
  pictureWdith?: number;
  aspectRatio?: string;
  divider?: boolean;
}) => {
  const dividerComponent = <Divider orientation="vertical" flexItem />;
  return (
    <Grid xs={width}>
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
              return (
                <Grid alignSelf="stretch" key={game.name} xs={pictureWdith}>
                  <Card variant="outlined" sx={{ height: "100%" }}>
                    <CardMediaImage image={game.banner} width="100%" sx={{ aspectRatio }} alt={game.name} />
                    <CardContent sx={{ padding: "10px", ":last-child": { paddingBottom: "10px" } }}>
                      {labelComponent(input).map((stacks, index, labbels) => (
                        <Stack
                          key={`${title}-stacks-${game.name}-${index}`}
                          justifyContent="space-between"
                          alignItems="baseline"
                          direction="row"
                          divider={labbels.length === 1 ? dividerComponent : null}
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
