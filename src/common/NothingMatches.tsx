import { Button, Stack, Typography } from "@mui/material";
import { useNothingMatches } from "./nothingMatchesContext";

/**
 * What a chart or a wall draws in place of its rows once the reader's own settings have left none.
 *
 * The library is not empty — something narrowed it there — so the blank canvas a chart would
 * otherwise draw, or the grid a wall would otherwise draw with nothing in it, answers no question.
 * It names which setting did it and offers that one's own way back, a page scoped to a year with
 * nothing in it being as blank as a page filtered to nothing and undone somewhere else entirely.
 * Both are the page's own dispatch: a dozen of these stand on one page, and each holding a reset
 * handed down to it is a dozen places for the wrong tab's state to be cleared from.
 *
 * Where both narrow the page the filters lead, they being the setting a reader sets several of and
 * the likelier of the two to be the surprise; the scope's way back stands beside it, so neither
 * has to be guessed at.
 *
 * Drawn by a shell that has already found it has nothing to draw and asked
 * `useNothingMatches().active` why, so the message itself needs nothing from its caller.
 */
export const NothingMatches = () => {
  const { filtersActive, scope, clearFilters, clearScope } = useNothingMatches();

  return (
    <Stack
      spacing={1.5}
      sx={{ alignItems: "flex-start", paddingY: 3 }}
    >
      <Typography
        variant="body2"
        sx={{ color: "text.secondary" }}
      >
        {/* The scope states itself in the words its own control wears — "In 2019", "Up to 1998" —
            so the message and the picker cannot describe one setting two ways. */}
        {filtersActive || !scope ? "Nothing matches these filters" : `Nothing ${scope.toLowerCase()}`}
      </Typography>
      <Stack
        direction="row"
        spacing={1}
        sx={{ flexWrap: "wrap" }}
      >
        {filtersActive && (
          <Button
            size="small"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
        {scope && (
          <Button
            size="small"
            onClick={clearScope}
          >
            Show all time
          </Button>
        )}
      </Stack>
    </Stack>
  );
};
