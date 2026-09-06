import { Box, Stack, Typography } from "@mui/material";
import type { ReactNode } from "react";
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
 * How much of each medium something holds, as a dot and a word apiece.
 *
 * One row for a franchise hit, an attribute hit and the franchise view's own header, because the
 * three ask the same question — which libraries is this in, and how much of each — and the answer
 * is read the same way whether it sits under a name in the box or above a strip in a dialog.
 *
 * The word is the caller's, since what a count is counted in is not the row's to know: a franchise
 * says a medium in its own unit ("3 films"), and an attribute in the tab's own noun, where a show
 * is a show and not the seasons the union flattens it to. A medium with nothing goes unmentioned
 * rather than stating a zero.
 */
export const MediaCounts = ({
  counts,
  media,
  wordFor,
  scheme,
  lead,
  band,
}: {
  counts: Partial<Record<Medium, number>>;
  /** Which media to say, in the order they are said in; every one unless the caller narrows it. */
  media?: readonly Medium[];
  wordFor: (medium: Medium, count: number) => string;
  scheme: Scheme;
  /** What stands before the counts on the same row — the category an attribute belongs to. */
  lead?: ReactNode;
  /**
   * A band of its own rather than part of a line of facts: the counts set a little apart, in the
   * weight a header reads at, and wrapping where a row of spans inside a caption cannot.
   */
  band?: boolean;
}) => (
  <Stack
    direction="row"
    spacing={band ? 1.5 : 1.25}
    useFlexGap={band}
    component={band ? "div" : "span"}
    sx={band ? { flexWrap: "wrap" } : undefined}
  >
    {lead}
    {(media ?? MEDIA).map((medium) => {
      const count = counts[medium];
      if (!count) return null;
      return (
        <Typography
          key={medium}
          variant={band ? "caption" : "inherit"}
          component="span"
          sx={{ display: "inline-flex", alignItems: "center", fontWeight: band ? 600 : undefined }}
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
