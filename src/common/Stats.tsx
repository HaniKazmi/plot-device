import {
  Box,
  type BoxProps,
  Card,
  CardContent,
  CardHeader,
  Dialog,
  Divider,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import { groupTotals } from "./statsData";
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
        direction={"row"}
        sx={{
          justifyContent: "space-evenly",
        }}
      >
        {content.map(([key, val]) => (
          <Stack
            key={key}
            direction={"column"}
            sx={{
              flex: "1 1 0",
            }}
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
              sx={{
                color: "text.secondary",
              }}
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
          title={title}
          avatar={icon}
          sx={{ paddingBottom: "5px" }}
          action={action}
          slotProps={{
            title: { variant: "h6" },
          }}
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

  const renderContent = (isDialog: boolean) => (
    <>
      <CardHeader
        title={title}
        avatar={icon}
        action={
          <Stack direction="row-reverse">
            {content.length > 6 && (
              <IconButton onClick={() => setDialogOpen(!isDialog)}>
                {isDialog ? <CloseFullscreen color="primary" /> : <Fullscreen />}
              </IconButton>
            )}
            {controls}
          </Stack>
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
            flexWrap: isDialog ? undefined : { xs: "nowrap", md: wrap ? "wrap" : "nowrap" },
          }}
        >
          {content.slice(0, isDialog || !wrap ? 18 : 6).map((entry) => (
            <StatsListCard
              key={`${title}-statslistcard-${nameComponent(entry)}`}
              item={entry}
              labels={labelComponent(entry)}
              chip={chipComponent?.(entry)}
              pictureWidth={isDialog ? dialogPictureWidth : pictureWidth}
              {...props}
            />
          ))}
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
        {renderContent(false)}
        <Dialog
          open={dialogOpen}
          fullScreen
        >
          {renderContent(true)}
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
      size={{
        xs: pictureWidth[0],
        sm: pictureWidth[1],
        md: pictureWidth[2],
      }}
      sx={{
        flexShrink: 0,
        alignSelf: "stretch",
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
          extractColour
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

export const Segment = ({
  percent,
  backgroundColour,
  spacing = 2,
  sx,
  ...props
}: {
  percent: number;
  backgroundColour: string;
  spacing?: number;
} & BoxProps) => (
  <Box
    sx={{
      width: `${percent}%`,
      height: (theme) => theme.spacing(spacing),
      backgroundColor: backgroundColour,
      transition: "opacity 0.2s",
      ...sx,
    }}
    {...props}
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
  const totals = groupTotals(data, group, groupKey, measureFunc, groupToColour);

  const topToBottomSx = {
    textOrientation: { xs: "sideways", md: "initial" },
    writingMode: { xs: "vertical-lr", md: "initial" },
  };

  return (
    <Card sx={{ height: "100%" }}>
      <CardHeader
        title={title}
        avatar={icon}
        slotProps={{
          title: { variant: "h6" },
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
          spacing={0.5}
          sx={{
            alignItems: "center",
            height: (theme) => theme.spacing(3),
          }}
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
          sx={{
            alignItems: "flex-start",
          }}
        >
          {totals.map((struct) => (
            <Stack
              key={struct.name}
              direction="column"
              spacing={{ xs: 1, md: 0 }}
              sx={{
                width: "100%",
              }}
            >
              <Segment
                percent={100}
                backgroundColour={struct.colour}
                spacing={1}
              />
              <Stack
                direction={{ xs: "row-reverse", md: "column" }}
                sx={{
                  width: "100%",
                }}
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
