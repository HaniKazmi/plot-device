import { Close } from "@mui/icons-material";
import { Box, Button, IconButton, Typography, type Theme } from "@mui/material";
import { useState } from "react";
import { safeAreaGutters } from "../common/chrome";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";
import { useAuthState } from "./authState";

/** Where a dismissal is held: the sitting, not the profile — the next visit's cache is stale again. */
const DISMISSED_KEY = "stale-strip-dismissed";

/**
 * Whether this sitting has already waved the strip away. Read inside the initialiser and behind a
 * guard, since the storage is absent where the module is imported without a window and refused
 * outright in a browser set to block site data.
 */
const readDismissed = (): boolean => {
  try {
    return sessionStorage.getItem(DISMISSED_KEY) === "1";
  } catch {
    return false;
  }
};

const writeDismissed = () => {
  try {
    sessionStorage.setItem(DISMISSED_KEY, "1");
  } catch {
    // Storage full or refused: the strip comes back on the next render pass and nothing else breaks.
  }
};

/**
 * The strip's ground: the tab's primary at the strength a lit control wears, so the line reads as
 * belonging to the bar above it rather than as a card the page opened with. Composed from the
 * channel triple through the CSS variable, since a colour mixed for the white paper is a different
 * colour against the dark one and the variable is what the scheme switch moves.
 *
 * It gives back the bar's own bottom margin and takes it again below, which is what stands the
 * strip flush against the bar: the two are one piece of chrome, and 16px of page between them reads
 * as a notice floating over the content instead.
 */
const STRIP_SX = (theme: Theme) => ({
  display: "flex",
  alignItems: "center",
  gap: 1.25,
  paddingTop: 0.75,
  paddingBottom: 0.75,
  marginTop: -2,
  marginBottom: 2,
  backgroundColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.08)`,
  borderBottom: `1px solid ${theme.vars.palette.divider}`,
  // A wash carries further on white than on the dark paper, where 8% of a colour over #14171a is
  // a strip a reader has to look for. `applyStyles` rather than `theme.palette.mode`, which reads
  // the light scheme's literal under `cssVariables: true` whichever paper is on screen.
  ...theme.applyStyles("dark", {
    backgroundColor: `rgba(${theme.vars.palette.primary.mainChannel} / 0.14)`,
  }),
  ...safeAreaGutters(theme),
});

/**
 * What a page painted from last visit's copy says about itself.
 *
 * A strip and not a snackbar: the state it reports lasts until someone acts on it, where a notice
 * that times out leaves a full page with nothing anywhere saying the data on it is a week old — the
 * gap a cache-first paint opens and nothing else closes. It carries the word the bar's key cannot,
 * and the same callback, so a reader answers it wherever their eye lands first.
 *
 * It scrolls away with the app bar, both being `position: static`, so the section rail below still
 * pins itself to the top of the viewport and no anchor's scroll margin changes.
 *
 * Dismissal is the sitting's, held outside React: this component unmounts the moment a fetch lands
 * and mounts again on the next tab that finds no token, and a flag in state would offer the strip
 * back each time.
 */
export const StaleStrip = () => {
  const authState = useAuthState();
  const { authorise } = useGoogleAuth();
  const [dismissed, setDismissed] = useState(readDismissed);

  if (authState !== "stale" || dismissed) return null;

  return (
    <Box sx={STRIP_SX}>
      <Typography
        variant="body2"
        sx={{ flex: 1 }}
      >
        Showing cached data
      </Typography>
      <Button
        size="small"
        variant="outlined"
        onClick={authorise}
        sx={{ borderColor: "divider", backgroundColor: "background.paper" }}
      >
        Authorise
      </Button>
      <IconButton
        aria-label="Dismiss"
        onClick={() => {
          writeDismissed();
          setDismissed(true);
        }}
      >
        <Close />
      </IconButton>
    </Box>
  );
};
