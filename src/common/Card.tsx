import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Chip,
  Dialog,
  Divider,
  Grow,
  Stack,
  SxProps,
  Theme,
  Tooltip,
  Typography,
  type ChipProps,
} from "@mui/material";
import { type FunctionComponent, type ReactNode, useRef, useState } from "react";
import { imageToColour } from "../utils/colourUtils";
import Grid from "@mui/material/Grid";
import type { Colour } from "../utils/types";

export interface CardMediaImageProps {
  image?: string;
  alt: string;
  colour?: Colour;
  chip?: Pick<ChipProps, "label" | "icon" | "onClick" | "variant"> & { colour?: Colour };
  lazy?: boolean;
  footerComponent?: ReactNode;
  /**
   * Built lazily: `Finished` renders a card per item with no cap, and this tree is only ever
   * mounted for the one card whose dialog is open.
   */
  detailComponent?: () => ReactNode;
  sx?: SxProps<Theme>;
  landscape?: boolean;
  /** Derive the card's theme colour from the image once it loads. Costs a canvas read per image. */
  extractColour?: boolean;
}

export type TypedCardMediaImage<T> = FunctionComponent<
  Omit<CardMediaImageProps, "image" | "alt" | "detailComponent"> & { item: T }
>;

export const CardMediaImage = ({
  image,
  alt,
  chip,
  colour: propColour,
  lazy = false,
  footerComponent,
  detailComponent,
  landscape = false,
  extractColour = false,
  sx,
}: CardMediaImageProps) => {
  const [dialogOpen, setDialogOpen] = useState<boolean>(false);
  const [colour, setColour] = useState<Colour | undefined>(propColour ?? imageToColour(image));
  const imgRef = useRef<HTMLImageElement>(null);

  return (
    <Card
      sx={{
        height: "100%",
        position: "relative",
        backgroundColor: colour,
        display: landscape ? "flex" : undefined,
        color: (theme) => colour && theme.palette.getContrastText(colour),
      }}
    >
      <CardActionArea>
        <CardMedia
          height={"100%"}
          component="img"
          crossOrigin="anonymous"
          src={image}
          alt={alt}
          onClick={() => {
            if (!colour) imageToColour(imgRef.current as HTMLImageElement, setColour);
            setDialogOpen(true);
          }}
          loading={lazy ? "lazy" : undefined}
          ref={imgRef}
          onLoad={(el) => {
            if (extractColour && !colour) {
              imageToColour(el.target as HTMLImageElement, setColour);
            }
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
              backgroundColor: chip.colour ?? "primary.main",
              color: (theme) => (chip.colour ? theme.palette.getContrastText(chip.colour) : undefined),
            }}
            label={chip.label}
            icon={chip.icon}
            onClick={chip.onClick}
            variant={chip.variant || "filled"}
            size="small"
          />
        )}
      </CardActionArea>
      {footerComponent}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth={false}
        scroll="body"
        slots={{ transition: Grow }}
        slotProps={{ paper: { sx: { backgroundColor: "unset", boxShadow: "unset", backgroundImage: "unset" } } }}
      >
        <Card
          sx={{
            backgroundColor: colour,
            color: (theme) => colour && theme.palette.getContrastText(colour),
          }}
        >
          <Box
            onClick={() => setDialogOpen(false)}
            sx={{
              position: "relative",
            }}
          >
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
                maxHeight: (theme) => `calc(100vh - ${theme.spacing(4)})`,
                maxWidth: (theme) => `calc(100vw - ${theme.spacing(4)})`,
                display: "block",
              }}
              src={image}
              title={alt}
              loading="lazy"
              onClick={() => setDialogOpen(false)}
            />
          </Box>
          <Box
            sx={{
              display: "flex",
            }}
          >
            <Box
              sx={{
                flexGrow: "1",
                width: "0px",
              }}
            >
              {dialogOpen && detailComponent?.()}
            </Box>
          </Box>
        </Card>
      </Dialog>
    </Card>
  );
};

export const DetailCard = ({
  colour,
  label,
  value,
  large,
}: {
  colour?: string;
  label: string;
  value: string | ReactNode;
  large?: boolean;
}) => {
  if (!value) return null;
  return (
    <Grid
      size={{
        xs: large ? 12 : 6,
        md: large ? 6 : 3,
      }}
    >
      <Card
        sx={{
          height: "100%",
          background: colour ?? "unset",
          color: (theme) => (colour ? theme.palette.getContrastText(colour) : "unset"),
        }}
      >
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 2 },
            height: "100%",
          }}
        >
          <Stack
            direction={"column"}
            sx={{
              height: "100%",
              justifyContent: "space-between",
            }}
          >
            <Typography
              align="center"
              variant="body1"
            >
              {value}
            </Typography>
            <Typography
              align="center"
              variant="caption"
              sx={{ opacity: 0.8 }}
            >
              {label}
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};

export const FooterComponent = ({
  labels,
  divider,
  justify,
}: {
  labels: ReactNode[][];
  divider?: boolean;
  justify?: boolean;
}) => (
  <CardContent
    sx={{
      padding: "10px",
      ":last-child": { paddingBottom: "10px" },
      width: "100%",
    }}
  >
    {labels.map((stacks, index) => (
      <Stack
        key={`stacks-${index}`}
        direction="row"
        divider={
          divider ? (
            <Divider
              orientation="vertical"
              flexItem
            />
          ) : null
        }
        sx={{
          justifyContent: stacks.length === 1 ? "center" : justify ? "space-around" : "space-between",
        }}
      >
        {stacks.map((val, index) =>
          typeof val === "string" ? (
            <Typography
              key={val}
              variant="subtitle2"
            >
              {val}
            </Typography>
          ) : (
            <div key={index}>{val}</div>
          ),
        )}
      </Stack>
    ))}
  </CardContent>
);

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
  <Tooltip
    title={tooltip}
    placement="top"
    disableHoverListener={!tooltip}
    disableTouchListener={!tooltip}
  >
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

export const TimelineCard = ({ segments }: { segments: ReactNode[] }) => {
  return (
    <Grid size={12}>
      <Card sx={{ height: "100%", background: "unset", color: "unset" }}>
        <CardContent
          sx={{
            ":last-child": { paddingBottom: 0 },
            height: "100%",
            padding: 1,
            paddingTop: 0,
          }}
        >
          <Stack
            direction="row"
            sx={{
              alignItems: "center",
              height: (theme) => theme.spacing(3),
            }}
          >
            {segments}
          </Stack>
        </CardContent>
      </Card>
    </Grid>
  );
};
