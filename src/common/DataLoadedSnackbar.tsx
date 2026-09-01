import { Alert, Snackbar } from "@mui/material";
import { useState } from "react";

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
  const [snackbarClosed, setSnackbarClosed] = useState(false);
  const [errorClosed, setErrorClosed] = useState(false);

  // Dismissal is tracked per kind. Sharing one flag would let a reader who waved away a refresh
  // notice suppress the error that arrives after it — the one message worth interrupting for.
  if (error) {
    return (
      <Snackbar
        open={!errorClosed}
        onClose={() => setErrorClosed(true)}
      >
        <Alert
          severity="error"
          variant="filled"
          onClose={() => setErrorClosed(true)}
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
      open={open && !snackbarClosed}
      autoHideDuration={1000}
      onClose={() => setSnackbarClosed(true)}
      message="Refresh Complete"
    />
  );
};
