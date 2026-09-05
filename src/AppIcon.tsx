import { SvgIcon, type SvgIconProps } from "@mui/material";

/**
 * The app's mark at glyph size: `public/favicon.svg`'s four blocks drawn in one ink, for the bar
 * beside the wordmark. The favicon's blocks are one medium fill each; here they take
 * `currentColor`, since the bar is already a tab's own colour and a magenta block on the Games bar
 * is a block that has disappeared. What survives without the colour is the arrangement — a banner
 * over a cover beside a poster over a banner, the phone's Now band — which is why the blocks are
 * inset here rather than run to the edge: at 24px a full-bleed tile in one ink is a square.
 */
export const AppIcon = (props: SvgIconProps) => (
  <SvgIcon
    {...props}
    viewBox="0 0 24 24"
  >
    <rect
      x="3"
      y="3"
      width="8.25"
      height="7"
      rx="1"
    />
    <rect
      x="3"
      y="11.5"
      width="8.25"
      height="9.5"
      rx="1"
    />
    <rect
      x="12.75"
      y="3"
      width="8.25"
      height="9.5"
      rx="1"
    />
    <rect
      x="12.75"
      y="14"
      width="8.25"
      height="7"
      rx="1"
    />
  </SvgIcon>
);
