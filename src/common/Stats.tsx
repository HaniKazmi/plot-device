import {
  Card,
  CardContent,
  CardHeader,
  Dialog,
  Divider,
  IconButton,
  Stack,
  type SxProps,
  type Theme,
  Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid";
import { format } from "../utils/mathUtils";
import { groupTotals } from "./statsData";
import { FooterComponent, Segment, type CardMediaImageProps, type TypedCardMediaImage } from "./Card";
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
  content: [string, number][];
}) => {
  const formattedContent = (
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

/** How many cards a strip shows collapsed, and how many its fullscreen dialog shows. */
export const COLLAPSED_CARDS = 6;
export const EXPANDED_CARDS = 18;

/**
 * A card that can also present itself fullscreen.
 *
 * `renderContent` is called twice — once inline, once for the dialog — and is handed the
 * expand/collapse control to place wherever its header wants it. The dialog body is mounted
 * only while open, so a strip of media cards is not built a second time behind a closed
 * dialog, and `dialogMounted` lags `dialogOpen` so the body survives the exit transition.
 */
export const ExpandableCard = ({
  renderContent,
  expandable = true,
  sx,
}: {
  renderContent: (isDialog: boolean, toggle: ReactNode) => ReactNode;
  expandable?: boolean;
  sx?: SxProps<Theme>;
}) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [dialogMounted, setDialogMounted] = useState<boolean>(false);

  // The dialog always keeps its control, whatever `expandable` says. It is fullscreen with no
  // `onClose`, so the button is the only way out, and a caller whose content shrinks while it is
  // open — a select box in the header switching to a category with fewer groups — would
  // otherwise strand the reader with nothing to click.
  const toggle = (isDialog: boolean) =>
    expandable || isDialog ? (
      <IconButton
        onClick={() => {
          setDialogOpen(!isDialog);
          if (!isDialog) setDialogMounted(true);
        }}
      >
        {isDialog ? <CloseFullscreen color="primary" /> : <Fullscreen />}
      </IconButton>
    ) : null;

  return (
    <Card sx={sx}>
      {renderContent(false, toggle(false))}
      <Dialog
        open={dialogOpen}
        fullScreen
        slotProps={{ transition: { onExited: () => setDialogMounted(false) } }}
      >
        {dialogMounted && renderContent(true, toggle(true))}
      </Dialog>
    </Card>
  );
};

/**
 * A strip of media cards, capped so a long list does not render in full.
 *
 * `limit` is passed in because how much fits depends on how the strip is laid out, but it is
 * meant to come from `COLLAPSED_CARDS` / `EXPANDED_CARDS` rather than a literal. Slicing here
 * rather than before the call is what keeps those constants meaningful — a caller that trimmed
 * its own list first would silently ignore any change to them.
 */
export const StatsListGrid = <T,>({
  content,
  limit,
  flexWrap,
  cardKey,
  labelComponent,
  chipComponent,
  ...props
}: {
  content: T[];
  limit: number;
  flexWrap?: { xs: "nowrap"; md: "wrap" | "nowrap" };
  cardKey: (t: T) => string;
  labelComponent: (t: T) => string[][];
  chipComponent?: (t: T) => CardMediaImageProps["chip"];
  pictureWidth: [number, number, number];
  aspectRatio?: string;
  divider?: boolean;
  MediaComponent: TypedCardMediaImage<T>;
}) => (
  <CardContent>
    <Grid
      container
      spacing={1}
      sx={{
        alignItems: "center",
        overflow: "auto",
        flexWrap,
      }}
    >
      {content.slice(0, limit).map((entry) => (
        <StatsListCard
          key={cardKey(entry)}
          item={entry}
          labels={labelComponent(entry)}
          chip={chipComponent?.(entry)}
          {...props}
        />
      ))}
    </Grid>
  </CardContent>
);

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
}: StatsListProps<T>) => (
  <Grid
    size={{
      xs: width[0],
      sm: width[1],
      md: width[2],
    }}
  >
    <ExpandableCard
      sx={{ height: "100%" }}
      expandable={content.length > COLLAPSED_CARDS}
      renderContent={(isDialog, toggle) => (
        <>
          <CardHeader
            title={title}
            avatar={icon}
            action={
              <Stack direction="row-reverse">
                {toggle}
                {controls}
              </Stack>
            }
            slotProps={{ title: { variant: "h6" } }}
          />
          <StatsListGrid
            content={content}
            // A non-wrapping strip scrolls sideways instead of clipping, so it can hold the
            // expanded count without the card growing.
            limit={isDialog || !wrap ? EXPANDED_CARDS : COLLAPSED_CARDS}
            flexWrap={isDialog ? undefined : { xs: "nowrap", md: wrap ? "wrap" : "nowrap" }}
            cardKey={(entry) => `${title}-statslistcard-${nameComponent(entry)}`}
            labelComponent={labelComponent}
            chipComponent={chipComponent}
            pictureWidth={isDialog ? dialogPictureWidth : pictureWidth}
            {...props}
          />
        </>
      )}
    />
  </Grid>
);

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
          footerComponent={(accent) => (
            <FooterComponent
              labels={labels}
              divider={divider}
              accent={accent}
            />
          )}
        />
      </Card>
    </Grid>
  );
};

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
