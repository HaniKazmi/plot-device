import { Button } from "@mui/material";
import { NoticeCard } from "../common/NoticeCard";
import { useGoogleAuth } from "../contexts/GoogleAuthContext";

/**
 * The page a reader gets before there is anything to draw: no cached copy and no token.
 *
 * The stale strip grown to a card, because here it is not a note about the page but the whole of
 * it — a first visit otherwise paints a bar over an empty container, with no fetch to fail and so
 * nothing for the snackbar to report either. It says what the app does before it asks for anything,
 * since "Authorise" alone on a blank page is a request with no stated purpose.
 */
export const EmptyCard = () => {
  const { authorise } = useGoogleAuth();

  return (
    <NoticeCard
      title="Nothing here yet"
      body="Plot Device reads your sheets in the browser. Authorise once per tab to load them."
      action={
        // `authorise` is certainly there: the card is drawn for the `empty` state alone, which is
        // reached only once neither callback being present has been ruled out.
        <Button
          size="small"
          variant="contained"
          onClick={authorise}
          sx={{ minHeight: 32, paddingX: 1.75 }}
        >
          Authorise with Google
        </Button>
      }
    />
  );
};
