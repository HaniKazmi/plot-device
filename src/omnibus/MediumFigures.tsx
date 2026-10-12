import { Box, Stack, Typography, type SxProps, type Theme } from "@mui/material";
import { MUTED_FIGURE_SX } from "../common/typography";
import { useScheme } from "../common/useScheme";
import { MediumDot } from "../app/MediaCounts";
import type { Medium } from "../app/types";

/**
 * A figure per medium, each beside its medium's dot: the fill names a medium wherever a tile is too
 * narrow for its word, and four words would be the tile's width. `label` is what the figure says
 * aloud, the dot being silent.
 */
export const MediumFigures = ({
  figures,
  sx,
}: {
  figures: { medium: Medium; text: string; label: string }[];
  sx?: SxProps<Theme>;
}) => {
  const scheme = useScheme();
  return (
    <Box sx={sx}>
      {figures.map(({ medium, text, label }) => (
        <Stack
          key={medium}
          direction="row"
          sx={{ alignItems: "center" }}
          aria-label={label}
        >
          <MediumDot
            medium={medium}
            scheme={scheme}
          />
          <Typography
            variant="body2"
            sx={MUTED_FIGURE_SX}
          >
            {text}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
};
