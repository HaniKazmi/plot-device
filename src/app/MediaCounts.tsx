import { Box, Stack, Typography } from "@mui/material";
import type { Scheme } from "../utils/types";
import { MEDIA, mediumToColour, type Medium } from "../utils/types";

/**
 * A medium's dot: the app's shortest word for which library something is from.
 *
 * Exported because a hit's line of facts names a medium once and a whole row of them names several,
 * and a dot drawn at one size in the box and another in the franchise view would be a legend per
 * surface rather than one colour meaning one medium everywhere.
 */
export const MediumDot = ({ medium, scheme }: { medium: Medium; scheme: Scheme }) => (
  <Box
    component="span"
    sx={{
      display: "inline-block",
      width: 8,
      height: 8,
      borderRadius: "50%",
      backgroundColor: mediumToColour(medium, scheme),
      marginRight: 0.75,
      verticalAlign: "0.05em",
      flexShrink: 0,
    }}
  />
);

/**
 * How much of each medium something holds, as a dot and a word apiece: a band of its own above the
 * franchise view's strip, the counts set a little apart in the weight a header reads at.
 *
 * The word is the caller's, since what a count is counted in is not the row's to know — a franchise
 * says a medium in its own unit ("3 films"). A medium with nothing goes unmentioned rather than
 * stating a zero.
 */
export const MediaCounts = ({
  counts,
  wordFor,
  scheme,
}: {
  counts: Partial<Record<Medium, number>>;
  wordFor: (medium: Medium, count: number) => string;
  scheme: Scheme;
}) => (
  <Stack
    direction="row"
    spacing={1.5}
    useFlexGap
    sx={{ flexWrap: "wrap" }}
  >
    {MEDIA.map((medium) => {
      const count = counts[medium];
      if (!count) return null;
      return (
        <Typography
          key={medium}
          variant="caption"
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", fontWeight: 600 }}
        >
          <MediumDot
            medium={medium}
            scheme={scheme}
          />
          {wordFor(medium, count)}
        </Typography>
      );
    })}
  </Stack>
);
