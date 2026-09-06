import type { Theme } from "@mui/material";

/**
 * The kit's parts re-toned for a tab's own bar colour, for the one row that stands on one: the
 * page's rail drawn inside the phone's bottom bar (`BottomTabs.tsx`). That row holds the chip
 * calling the tabs back, the section chips, and the picker opening the page's settings with its
 * count badge — so those are the parts named here, and a part the row never holds is not.
 *
 * Unlit chips and pickers take the bar's ink with a half-strength outline; a lit chip and the badge
 * are filled with that ink and worded in the bar's own colour, since a part lit in the primary is
 * invisible on a bar that *is* the primary. On the light paper the ink is the primary's contrast
 * text; on the dark tint it is the theme's own text, the tint being solved for it.
 *
 * `ground` is the colour the bar is painted in, which is what a filled part is worded in. The light
 * paper's bar is the primary exactly, so the primary answers there; the dark scheme's is a 22% tint
 * of it, and the paper underneath is not the surface the word actually sits on.
 *
 * A chip carrying a colour of its own — the tab in hand, in that tab's own ink — keeps it on the
 * dark bar, where the tab inks are solved to be read against the tint. These are descendant rules
 * and outrank a child's own `sx`, so the exemption has to be stated here; on the light bar there is
 * nothing to exempt, a tab's own colour being the colour that bar is painted in.
 */
export const onBarSx = (dark: boolean, ground?: string) => (theme: Theme) => {
  const inkChannel = dark ? theme.vars.palette.text.primaryChannel : theme.vars.palette.primary.contrastTextChannel;
  const ink = `rgb(${inkChannel})`;
  const line = `rgba(${inkChannel} / 0.55)`;
  const wash = `rgba(${inkChannel} / 0.12)`;
  // A tab with no bar colour of its own leaves the bar on the paper, which is then the surface a
  // filled part's word stands on.
  const onInk = dark ? (ground ?? theme.vars.palette.background.paper) : theme.vars.palette.primary.main;
  const chip = dark ? "& .MuiChip-root:not([data-own-colour])" : "& .MuiChip-root";
  return {
    [chip]: { color: ink, borderColor: line, backgroundColor: "transparent" },
    [`${chip} svg`]: { color: ink },
    "& .MuiChip-filled.MuiChip-colorPrimary": { backgroundColor: ink, color: onInk },
    "& .MuiButton-root": { color: ink, borderColor: line, backgroundColor: "transparent" },
    "& .MuiButton-root .MuiButton-endIcon": { color: ink },
    "& .MuiBadge-badge": { backgroundColor: ink, color: onInk },
    "@media (hover: hover)": {
      "& .MuiChip-root:hover, & .MuiButton-root:hover": { backgroundColor: wash },
    },
  };
};
