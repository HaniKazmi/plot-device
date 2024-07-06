import { Box, Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { format } from "../utils/mathUtils";
import { Season, Show } from "../show/types";
import { TypedCardMediaImage } from "./Card";
import { ReactNode } from "react";
import { VideoGame } from "../vg/types";

export const StatCard = ({
  icon,
  title,
  action,
  content,
}: {
  icon: ReactNode;
  title: ReactNode;
  action?: ReactNode;
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
            <Typography align="center" variant="subtitle2" color="text.secondary">
              {key}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  return (
    <Grid xs={12} sm={6} md={3}>
      <Card sx={{ height: "100%" }}>
        <CardHeader
          titleTypographyProps={{ variant: "h6" }}
          title={title}
          avatar={icon}
          sx={{ paddingBottom: "5px" }}
          action={action}
        />
        <CardContent sx={{ paddingTop: "5px" }}>{formattedContent}</CardContent>
      </Card>
    </Grid>
  );
};

export interface StatsListProps<T extends VideoGame | Season> {
  icon: ReactNode;
  title: string;
  content: T[];
  width?: [number, number, number];
  labelComponent: (t: T) => string[][];
  chipComponent?: (t: T) => [string, string?];
  MediaComponent: TypedCardMediaImage<T>;
  pictureWidth?: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
  landscape?: boolean;
  wrap?: boolean
}

export const StatList = <T extends VideoGame | Season>({
  icon,
  title,
  content,
  width = [12, 12, 6],
  chipComponent,
  labelComponent,
  wrap = true,
  ...props
}: StatsListProps<T>) => {
  return (
    <Grid xs={width[0]} sm={width[1]} md={width[2]}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <Grid
            container
            sx={{ overflow: "auto", flexWrap: { xs: "nowrap", md: wrap ?  "wrap" : "nowrap" } }}
            spacing={1}
            alignItems="center"
          >
            {content.map((entry) => {
              const { name } = "name" in entry ? entry : entry.show;
              return (
                <StatsListCard
                  key={title + "-statslistcard-" + name}
                  item={entry}
                  labels={labelComponent(entry)}
                  chip={chipComponent?.(entry)}
                  {...props}
                />
              );
            })}
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
};

const StatsListCard = <T extends VideoGame | Season>({
  item,
  labels,
  chip,
  pictureWidth = [12, 4, 6],
  aspectRatio,
  divider,
  landscape = false,
  MediaComponent,
}: {
  item: T;
  labels: string[][];
  chip?: [string, string?];
  pictureWidth?: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
  landscape?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => {
  const dividerComponent = <Divider orientation="vertical" flexItem />;
  return (
    <Grid flexShrink={0} alignSelf="stretch" xs={pictureWidth[0]} sm={pictureWidth[1]} md={pictureWidth[2]}>
      <Card variant="outlined" sx={{ height: "100%" }}>
        <MediaComponent
          item={item}
          width="100%"
          sx={{ aspectRatio, flexShrink: 0 }}
          chip={chip}
          landscape={landscape}
          footerComponent={(colour?: string) => (
            <CardContent
              sx={{
                padding: "10px",
                ":last-child": { paddingBottom: "10px" },
                background: colour,
                color: (theme) => colour && theme.palette.getContrastText(colour),
              }}
            >
              {labels.map((stacks, index, labels) => (
                <Stack
                  key={`stacks-${index}`}
                  justifyContent={stacks.length === 1 ? "center" : "space-between"}
                  direction="row"
                  divider={labels.length === 1 || divider ? dividerComponent : null}
                >
                  {stacks.map((val) => (
                    <Typography key={val} variant="subtitle2">
                      {val}
                    </Typography>
                  ))}
                </Stack>
              ))}
            </CardContent>
          )}
        />
      </Card>
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

export const TotalStack = <T extends string, 
U extends (VideoGame | Show), 
K extends keyof U>({
  title,
  data,
  measureFunc = (data: U[]) => data.length,
  groupKey,
  group,
  groupToColour,
  icon,
  measureLabel,
}: {
  title: string;
  data: U[];
  measureFunc?: (data: U[]) => number;
  groupKey: K;
  group: T[];
  groupToColour: (ele: T) => string;
  icon: ReactNode;
  measureLabel: string;
}) => {
  const total = measureFunc(data);
  let percentLeft = 100;

  const totals = group
    .map((e) => {
      const count = measureFunc(data.filter((vg) => vg[groupKey] === e))
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
              <Typography variant="body1">{`${struct.count} ${measureLabel}`}</Typography>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};