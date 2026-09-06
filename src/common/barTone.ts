import type { Theme } from "@mui/material";

/**
 * The kit's parts re-toned for a tab's own bar colour: unlit chips, pickers and segments in the
 * bar's ink with a half-strength outline, the lit chip and segment filled with that ink and worded
 * in the bar colour, since a part lit in the primary is invisible on a bar that *is* the primary.
 * On the light paper the ink is the primary's contrast text; on the dark tint it is the theme's own
 * text, the tint being solved for it.
 */
export const onBarSx = (dark: boolean) => (theme: Theme) => {
  const inkChannel = dark ? theme.vars.palette.text.primaryChannel : theme.vars.palette.primary.contrastTextChannel;
  const ink = `rgb(${inkChannel})`;
  const line = `rgba(${inkChannel} / 0.55)`;
  const wash = `rgba(${inkChannel} / 0.12)`;
  const onInk = dark ? theme.vars.palette.background.paper : theme.vars.palette.primary.main;
  return {
    "& .MuiChip-root": { color: ink, borderColor: line, backgroundColor: "transparent" },
    "& .MuiChip-root svg": { color: ink },
    "& .MuiChip-filled.MuiChip-colorPrimary": { backgroundColor: ink, color: onInk },
    "& .MuiButton-root": { color: ink, borderColor: line, backgroundColor: "transparent" },
    "& .MuiButton-root .MuiButton-endIcon": { color: ink },
    "& .MuiToggleButton-root": { color: ink, borderColor: line, backgroundColor: "transparent" },
    "& .MuiToggleButton-root.Mui-selected": { backgroundColor: ink, color: onInk },
    "& .MuiBadge-badge": { backgroundColor: ink, color: onInk },
    "& .MuiDivider-root": { borderColor: line },
    "@media (hover: hover)": {
      "& .MuiChip-root:hover, & .MuiButton-root:hover, & .MuiToggleButton-root:hover": { backgroundColor: wash },
    },
  };
};
