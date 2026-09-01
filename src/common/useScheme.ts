import { useColorScheme } from "@mui/material/styles";
import type { Scheme } from "../utils/types";

/**
 * Which paper the app is currently painting on, for the colour lookups that need to know.
 *
 * Read through `useColorScheme` rather than `useTheme().palette.mode`: the theme is built with
 * `cssVariables: true`, so `palette.mode` is the default scheme's literal whatever is on screen —
 * the same trap `artworkPalette` documents for `palette.background.paper`. This hook also
 * subscribes its caller to scheme changes, which is what re-renders a chart when the reader's
 * system flips at dusk; nothing else would, since the CSS variables turn over without React.
 *
 * `systemMode` is set only while the mode is "system", which is the default, so it is read first.
 */
export const useScheme = (): Scheme => {
  const { mode, systemMode } = useColorScheme();
  return (systemMode ?? mode) === "dark" ? "dark" : "light";
};
