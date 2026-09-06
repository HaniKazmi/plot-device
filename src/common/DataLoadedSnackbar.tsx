import { Alert, Snackbar } from "@mui/material";
import { useState } from "react";
import { BOTTOM_TABS_CLEARANCE } from "./chrome";

/**
 * Where the notice sits, which below `sm` is above the bottom navigation rather than under it —
 * MUI's own default puts it against the bottom edge, where the tab bar is fixed. `sm` restates
 * MUI's own 24px, since an `sx` value lands after the component's styles and a bare `bottom` would
 * override it at every width.
 */
const SNACKBAR_SX = { bottom: { xs: `calc(8px + ${BOTTOM_TABS_CLEARANCE})`, sm: 24 } } as const;

/**
 * What the fetch had to say: a one-second "Refresh Complete" when it replaced whatever the cache
 * painted, or the sheet's own complaint when it could not.
 *
 * The two are one component because they are the same event answered two ways, and a page shows at
 * most one of them. They are not one `Snackbar`, though: the success is a passing note and dismisses
 * itself, while the failure names a row somebody has to go and fix, so it stays until it is closed
 * and cannot be waited out.
 */
export const DataLoadedSnackbar = ({ open, error }: { open: boolean; error?: string }) => {
  /**
   * "Refresh Complete" is a report of an arrival, so it is said only for an arrival this component
   * watched happen: `open` turning from false to true while mounted. A tab whose every sheet was
   * already fetched by the tab the reader came from opens with `open` already true and says
   * nothing, which is the truth — nothing arrived — where announcing it would put a refresh notice
   * on every navigation between tabs.
   *
   * The turn is what is watched, rather than the first arrival since mounting. A refresh takes
   * `open` false and true again, so a latch set by the first arrival — or captured at mount — is a
   * component that answers a cold load and stays silent for every re-read after it, on the one tab
   * the reader is standing on. Comparing against the previous value during the render that changes
   * it is React's own way to hold state derived from a prop, and it re-arms by construction.
   *
   * **The caller has to keep this component mounted across that turn**, at a stable position among
   * its siblings. Rendering it alone while data is missing and again inside the loaded tree
   * remounts it exactly when the value turns over, and the transition is then unobservable — the
   * fresh mount sees only `true`.
   */
  const [previouslyOpen, setPreviouslyOpen] = useState(open);
  const [announcing, setAnnouncing] = useState(false);
  if (previouslyOpen !== open) {
    setPreviouslyOpen(open);
    if (open) setAnnouncing(true);
  }
  /**
   * The message a reader has waved away, rather than a flag saying they waved one away. A refetch
   * after re-authorising, or the Omnibus's four sheets answering in turn, replaces one complaint
   * with a different one; a flag would swallow every message after the first, and each of them
   * names a different row somebody has to go and fix.
   */
  const [dismissedError, setDismissedError] = useState<string | undefined>(undefined);

  // Dismissal is tracked per kind. Sharing one piece of state would let a reader who waved away a
  // refresh notice suppress the error that arrives after it — the one message worth interrupting
  // for.
  if (error) {
    return (
      <Snackbar
        open={error !== dismissedError}
        onClose={() => setDismissedError(error)}
        sx={SNACKBAR_SX}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setDismissedError(error)}
        >
          {/* The converter's own message, verbatim: it names the row, the item and the column,
              which is the whole reason `sheetError` wraps a failure in the identity of its row. */}
          {error}
        </Alert>
      </Snackbar>
    );
  }

  return (
    <Snackbar
      open={announcing}
      autoHideDuration={1000}
      onClose={() => setAnnouncing(false)}
      message="Refresh Complete"
      sx={SNACKBAR_SX}
    />
  );
};
