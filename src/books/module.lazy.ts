import { StarBorder, type SvgIconComponent } from "@mui/icons-material";
import type { KeysMatching } from "../utils/types";
import type { FilterState } from "./filterUtils";

/** The Books components, behind the chunk that draws them. See `vg/module.lazy.ts`. */
export { default as CardMediaImage, BookHoverCard as HoverCard } from "./CardMediaImage";

/** An icon per filter toggle, keyed as the schema keys its toggles. See `vg/module.lazy.ts`. */
export const filterIcons: Record<Extract<KeysMatching<FilterState, boolean>, string>, SvgIconComponent> = {
  unscored: StarBorder,
};
