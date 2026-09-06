import { Button, Paper, Stack, Typography } from "@mui/material";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";

/**
 * The page a reader gets before there is anything to draw: no cached copy and no token.
 *
 * The stale strip grown to a card, because here it is not a note about the page but the whole of
 * it — a first visit otherwise paints a bar over an empty container, with no fetch to fail and so
 * nothing for the snackbar to report either. It says what the app does before it asks for anything,
 * since "Authorise" alone on a blank page is a request with no stated purpose.
 *
 * `Paper` rather than `Card`, whose theme lights its border on hover: nothing here is hovered but
 * the button, and a card that answers the pointer without doing anything reads as a dead control.
 */
export const EmptyCard = () => {
  const { authorise } = useGoogleAuth();

  return (
    <Paper
      variant="outlined"
      sx={{ maxWidth: 420, marginX: "auto", marginTop: 3, padding: 3 }}
    >
      <Stack
        spacing={1}
        sx={{ alignItems: "center", textAlign: "center" }}
      >
        <Typography variant="h6">Nothing here yet</Typography>
        <Typography
          variant="body2"
          color="text.secondary"
        >
          Plot Device reads your sheets in the browser. Authorise once per tab to load them.
        </Typography>
        {/* `authorise` is certainly there: the card is drawn for the `empty` state alone, which is
            reached only once neither callback being present has been ruled out. */}
        <Button
          size="small"
          variant="contained"
          onClick={authorise}
          sx={{ minHeight: 32, paddingX: 1.75 }}
        >
          Authorise with Google
        </Button>
      </Stack>
    </Paper>
  );
};
