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
 * The sheet's own complaint when a fetch could not replace what the cache painted. It names a row
 * somebody has to go and fix, so it stays until it is closed and cannot be waited out; a fetch that
 * succeeds says nothing here, the bar's refresh having spun for as long as it was out.
 */
export const SheetErrorSnackbar = ({ error }: { error?: string }) => {
  /**
   * The message a reader has waved away, rather than a flag saying they waved one away. A refetch
   * after re-authorising, or the Omnibus's four sheets answering in turn, replaces one complaint
   * with a different one; a flag would swallow every message after the first, and each of them
   * names a different row somebody has to go and fix.
   */
  const [dismissedError, setDismissedError] = useState<string | undefined>(undefined);
  if (!error) return null;

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
};
