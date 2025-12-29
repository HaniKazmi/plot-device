import { Box, Card, CardContent, CardHeader, Dialog, Divider, IconButton, Stack, Typography } from "@mui/material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import { FooterComponent, type CardMediaImageProps, type TypedCardMediaImage } from "./Card";
import { useState, type ReactNode } from "react";
import type { Colour } from "../utils/types";
import { CloseFullscreen, Fullscreen } from "@mui/icons-material";

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
      <Typography
        align="right"
        variant="h4"
      >
        {content}
      </Typography>
    ) : (
      <Stack
        divider={
          <Divider
            orientation="vertical"
            flexItem
          />
        }
        justifyContent="space-evenly"
        direction={"row"}
      >
        {content.map(([key, val]) => (
          <Stack
            key={key}
            direction={"column"}
            flex="1 1 0"
          >
            <Typography
              align="center"
              variant="h5"
            >
              {format(val)}
            </Typography>
            <Typography
              align="center"
              variant="subtitle2"
              color="text.secondary"
            >
              {key}
            </Typography>
          </Stack>
        ))}
      </Stack>
    );
  return (
    <Grid
      size={{
        xs: 12,
        sm: 6,
        md: 3,
      }}
    >
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

export interface StatsListProps<T> {
  icon: ReactNode;
  title: string;
  controls?: ReactNode;
  content: T[];
  width: [number, number, number];
  nameComponent: (t: T) => string;
  labelComponent: (t: T) => string[][];
  MediaComponent: TypedCardMediaImage<T>;
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  dialogPictureWidth: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
  wrap?: boolean;
}

export const StatList = <T,>({
  icon,
  title,
  content,
  width,
  nameComponent,
  chipComponent,
  labelComponent,
  wrap = true,
  pictureWidth,
  dialogPictureWidth,
  controls,
  ...props
}: StatsListProps<T>) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const fullScreenButton = content.length > 6 && (
    <IconButton onClick={() => setDialogOpen(!dialogOpen)}>
      {dialogOpen ? <CloseFullscreen color="primary" /> : <Fullscreen />}
    </IconButton>
  );
  const cardContent = (
    <>
      <CardHeader
        title={title}
        avatar={icon}
        action={
          <Stack direction="row-reverse">
            {fullScreenButton}
            {controls}
          </Stack>
        }
        slotProps={{ title: { variant: "h6" } }}
      />
      <CardContent>
        <Grid
          container
          sx={{ overflow: "auto", flexWrap: dialogOpen ? undefined : { xs: "nowrap", md: wrap ? "wrap" : "nowrap" } }}
          spacing={1}
          alignItems="center"
        >
          {content.slice(0, dialogOpen || !wrap ? 18 : 6).map((entry) => {
            const name = nameComponent(entry);
            return (
              <StatsListCard
                key={title + "-statslistcard-" + name}
                item={entry}
                labels={labelComponent(entry)}
                chip={chipComponent?.(entry)}
                pictureWidth={dialogOpen && dialogPictureWidth ? dialogPictureWidth : pictureWidth}
                {...props}
              />
            );
          })}
        </Grid>
      </CardContent>
    </>
  );
  return (
    <Grid
      size={{
        xs: width[0],
        sm: width[1],
        md: width[2],
      }}
    >
      <Card sx={{ height: "100%" }}>
        {cardContent}
        <Dialog
          open={dialogOpen}
          fullScreen
        >
          {cardContent}
        </Dialog>
      </Card>
    </Grid>
  );
};

export const StatsListCard = <T,>({
  item,
  labels,
  chip,
  pictureWidth,
  aspectRatio,
  divider,
  MediaComponent,
}: {
  item: T;
  labels: string[][];
  chip?: CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => {
  return (
    <Grid
      flexShrink={0}
      alignSelf="stretch"
      size={{
        xs: pictureWidth[0],
        sm: pictureWidth[1],
        md: pictureWidth[2],
      }}
    >
      <Card
        variant="outlined"
        sx={{ height: "100%" }}
      >
        <MediaComponent
          item={item}
          sx={{ aspectRatio, flexShrink: 0 }}
          chip={chip}
          footerComponent={
            <FooterComponent
              labels={labels}
              divider={divider}
            />
          }
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

export const TotalStack = <T extends string, U, K extends keyof U>({
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
  groupToColour: (ele: T) => Colour;
  icon: ReactNode;
  measureLabel: string;
}) => {
  const total = measureFunc(data);
  let percentLeft = 100;

  const totals = group
    .map((e) => {
      const count = measureFunc(data.filter((vg) => vg[groupKey] === e));
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

  if (totals.length > 0) {
    totals[0].percent += percentLeft;
  }
  const topToBottomSx = {
    textOrientation: { xs: "sideways", md: "initial" },
    writingMode: { xs: "vertical-lr", md: "initial" },
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        titleTypographyProps={{ variant: "h6" }}
        title={title}
        avatar={icon}
      />
      <CardContent
        sx={{
          ":last-child": { paddingBottom: 1 },
          height: "100%",
        }}
      >
        <Stack
          direction="row"
          alignItems="center"
          height={(theme) => theme.spacing(3)}
          spacing={0.5}
        >
          {totals.map((struct) => (
            <Segment
              key={struct.name}
              percent={struct.percent}
              backgroundColour={struct.colour}
            />
          ))}
        </Stack>
        <Stack
          direction="row"
          spacing={1}
          alignItems="flex-start"
        >
          {totals.map((struct) => (
            <Stack
              key={struct.name}
              direction="column"
              width="100%"
              spacing={{ xs: 1, md: 0 }}
            >
              <Segment
                percent={100}
                backgroundColour={struct.colour}
                spacing={1}
              />
              <Stack
                key={struct.name}
                direction={{ xs: "row-reverse", md: "column" }}
                width="100%"
              >
                <Typography
                  sx={topToBottomSx}
                  variant="h6"
                >
                  {struct.name}
                </Typography>
                <Typography
                  sx={topToBottomSx}
                  variant="body1"
                >{`${struct.count} ${measureLabel}`}</Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
};
