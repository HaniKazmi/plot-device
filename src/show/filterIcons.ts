import { Animation, Block, type SvgIconComponent } from "@mui/icons-material";
import type { KeysMatching } from "../utils/types";
import type { FilterState } from "./filterUtils";

/** An icon per filter toggle, keyed as the schema keys its toggles. See `vg/filterIcons.ts`. */
export const filterIcons: Record<Extract<KeysMatching<FilterState, boolean>, string>, SvgIconComponent> = {
  abandoned: Block,
  anime: Animation,
};
