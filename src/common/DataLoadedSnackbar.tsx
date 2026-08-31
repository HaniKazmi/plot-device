import { Snackbar } from "@mui/material";
import { useState } from "react";

/** A one-second "Refresh Complete" once the fetch replaces whatever the cache painted. */
export const DataLoadedSnackbar = ({ open }: { open: boolean }) => {
  const [snackbarClosed, setSnackbarClosed] = useState(false);

  return (
    <Snackbar
      open={open && !snackbarClosed}
      autoHideDuration={1000}
      onClose={() => setSnackbarClosed(true)}
      message="Refresh Complete"
    />
  );
};
