import { Card, CardContent, CardHeader, Divider, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Unstable_Grid2";
import { format } from "../utils/mathUtils";
import { VideoGame } from "../vg/types";
import { Season } from "../show/types";
import { TypedCardMediaImage } from "./Card";
import { ReactNode } from "react";

export const StatCard = ({
  icon,
  title,
  content,
}: {
  icon: ReactNode;
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
}

export const StatList = <T extends VideoGame | Season>({
  icon,
  title,
  content,
  width = [12, 12, 6],
  chipComponent,
  labelComponent,
  ...props
}: StatsListProps<T>) => {
  return (
    <Grid xs={width[0]} sm={width[1]} md={width[2]}>
      <Card sx={{ height: "100%" }}>
        <CardHeader titleTypographyProps={{ variant: "h6" }} title={title} avatar={icon} />
        <CardContent>
          <Grid
            container
            sx={{ overflow: "auto", flexWrap: { xs: "nowrap", md: width[2] === 12 ? "nowrap" : "wrap" } }}
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
