import { Animation, StarBorder, Weekend, type SvgIconComponent } from "@mui/icons-material";
import type { KeysMatching } from "../utils/types";
import type { FilterState } from "./filterUtils";

/** The Movies components, behind the chunk that draws them. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, MovieHoverCard as HoverCard } from "./CardMediaImage";

/** An icon per filter toggle, keyed as the schema keys its toggles. See `vg/module.lazy.ts`. */
export const filterIcons: Record<Extract<KeysMatching<FilterState, boolean>, string>, SvgIconComponent> = {
  home: Weekend,
  unscored: StarBorder,
  anime: Animation,
};
