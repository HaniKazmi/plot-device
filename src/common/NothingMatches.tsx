import { Button, Stack, Typography } from "@mui/material";

/**
 * What a chart or a wall draws in place of its rows once the reader's own filters have left none.
 *
 * The library is not empty — something narrowed it there — so the blank canvas a chart would
 * otherwise draw, or the grid a wall would otherwise draw with nothing in it, answers no question.
 * Clear is the one control that knows how to undo that: the caller's own dispatch, since this
 * component has no state of its own to reset.
 */
export const NothingMatches = ({ onClear }: { onClear: () => void }) => (
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
      onClick={onClear}
    >
      Clear filters
    </Button>
  </Stack>
);
