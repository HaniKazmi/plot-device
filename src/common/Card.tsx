import {
  Box,
  Card,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography
} from "@mui/material";
import { FunctionComponent, ReactNode, useRef, useState } from "react";
import { imageToColour } from "../utils/colourUtils";
import Grid from "@mui/material/Unstable_Grid2/Grid2";

export interface CardMediaImageProps {
  image?: string;
  alt: string;
  chip?: [string, string?];
  landscape?: boolean;
  height?: string;
  width?: string;
  footerComponent?: (colour?: string) => ReactNode;
  detailComponent?: (colour?: string) => ReactNode;
  sx?: SxProps<Theme>;
}

export type TypedCardMediaImage<T> = FunctionComponent<Omit<CardMediaImageProps, "banner" | "alt"> & { item: T }>

export const CardMediaImage = ({
  image,
  alt,
  chip,
  landscape = false,
  height,
  width,
  footerComponent,
  detailComponent,
  sx
}: CardMediaImageProps) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [colour, setColour] = useState<string | undefined>(imageToColour(image));
  return (
    <>
      <Box sx={{ height, width, position: "relative" }}>
        <CardMedia
          height={height}
          width={width}
          component="img"
          crossOrigin="anonymous"
          src={image}
          alt={alt}
          onClick={() => setDialogOpen(true)}
          ref={imgRef}
          loading="lazy"
          onLoad={() => {
            footerComponent && setColour?.(imageToColour(imgRef.current!));
          }}
          sx={sx}
        />
        {chip && (
          <Chip
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
              margin: 1,
              opacity: 0.8,
              backgroundColor: chip[1] ?? "primary.main",
              color: (theme) => (chip[1] ? theme.palette.getContrastText(chip[1]) : undefined),
            }}
            label={chip[0]}
            variant="filled"
            size="small"
          />
        )}
      </Box>
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={false}
        scroll="body"
        PaperProps={{ sx: { backgroundColor: "unset", boxShadow: "unset", backgroundImage: "unset" } }}
      >
        <Card>
          <Box position="relative" onClick={() => setDialogOpen(false)}>
            <Box
              sx={{
                background: `linear-gradient(to bottom, ${colour}00 80%, ${colour})`,
                position: "absolute",
                top: "90%",
                left: 0,
                right: 0,
                bottom: 0,
              }}
            />
            <CardMedia
              component="img"
              crossOrigin="anonymous"
              sx={{
                objectFit: "contain",
                maxHeight: theme => `calc(100vh - ${theme.spacing(4)})`,
                maxWidth: theme => `calc(100vw - ${theme.spacing(4)})`,
                aspectRatio: "auto",
                height: { xs: landscape ? "unset" : "100%", lg: landscape ? "unset" : "100vh" },
                width: { xs: landscape ? "100%" : "unset", lg: landscape ? "100vw" : "unset" },
              }}
              onLoad={() => {
                !footerComponent && setColour?.(imageToColour(imgRef.current!));
              }}
              src={image}
              title={alt}
              loading="lazy"
              onClick={() => setDialogOpen(false)}
            />
          </Box>
          <Box display="flex">
            <Box flexGrow="1" width="0px">
              {detailComponent?.(colour)}
            </Box>
          </Box>
        </Card>
      </Dialog>
      {footerComponent?.(colour)}
    </>
  );
};

export const DetailCard = ({ colour, label, value, large }: { colour?: string, label: string, value: string | ReactNode, large?: boolean }) => {
  if (!value) return null;
  return (
      <Grid xs={large ? 12 : 6} md={large ? 6 : 3}>
          <Card sx={{ height: "100%", background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}>
              <CardContent sx={{
                  ":last-child": { paddingBottom: 2 },
                  height: "100%"
              }}>
                  <Stack direction={"column"} height="100%" justifyContent="space-between">
                      <Typography align="center" variant="body1">
                          {value}
                      </Typography>
                      <Typography align="center" variant="caption" sx={{ opacity: 0.8 }}>
                          {label}
                      </Typography>
                  </Stack>
              </CardContent>
          </Card>
      </Grid>
  );
}

export const TimelineEmptySegment = ({ percent }: { percent: number }) => (
  <Box
    sx={{
      width: `${percent}%`,
      height: (theme) => theme.spacing(1),
      backgroundColor: "grey",
      opacity: 0.8,
    }}
  />
);

export const TimelineActivatedSegment = ({
                                    percent,
                                    tooltip,
                                    backgroundColour,
                                  }: {
  percent: number;
  tooltip?: ReactNode;
  backgroundColour: [string, string];
}) => (
  <Tooltip title={tooltip} placement="top" disableHoverListener={!tooltip} disableTouchListener={!tooltip}>
    <Box
      sx={{
        width: `${percent}%`,
        height: (theme) => theme.spacing(2),
        backgroundColor: backgroundColour[0],
        "&:hover": {
          height: (theme) => theme.spacing(3),
          backgroundColor: backgroundColour[1],
        },
      }}
    />
  </Tooltip>
);

export const TimelineCard = ({ colour, segments }: { colour?: string; segments: ReactNode[] }) => {
  return (
    <Grid xs={12}>
      <Card
        sx={{ height: "100%", background: colour, color: (theme) => colour && theme.palette.getContrastText(colour) }}
      >
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 0 },
            height: "100%",
            padding: 1,
            paddingTop: 0,
          }}
        >
          <Stack direction="row" alignItems="center" height={(theme) => theme.spacing(3)}>
            {segments}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};