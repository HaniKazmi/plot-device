import { Button, Stack, Typography } from "@mui/material";
import { useNothingMatches } from "./nothingMatchesContext";

/**
 * What a chart or a wall draws in place of its rows once the reader's own filters have left none.
 *
 * The library is not empty — something narrowed it there — so the blank canvas a chart would
 * otherwise draw, or the grid a wall would otherwise draw with nothing in it, answers no question.
 * Clear is the one control that knows how to undo that, and it is the page's own dispatch: a dozen
 * of these stand on one page, and each holding a reset handed down to it is a dozen places for the
 * wrong tab's state to be cleared from.
 *
 * Drawn by a shell that has already found it has nothing to draw and asked
 * `useNothingMatches().active` why, so the message itself needs nothing from its caller.
 */
export const NothingMatches = () => {
  const { clear } = useNothingMatches();

  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: "flex-start", paddingY: 3 }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary" }}
      >
        Nothing matches these filters
      </Typography>
      <Button
        size="small"
        onClick={clear}
      >
        Clear filters
      </Button>
    </Stack>
  );
};
