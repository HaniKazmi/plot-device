import { AllInclusive, CatchingPokemonTwoTone, QuestionMark, type SvgIconComponent } from "@mui/icons-material";
import type { KeysMatching } from "../utils/types";
import type { FilterState } from "./filterUtils";

/**
 * The Games components, behind the chunk that draws them.
 *
 * A registry keyed by medium is reachable from the shell, so anything named in `module.ts` lands
 * in the first bundle a visitor downloads. Cards and hover cards are deliberately not there, and
 * this file is where they stay out of it.
 */
export { default as CardMediaImage, VgHoverCard as HoverCard } from "./CardMediaImage";

/**
 * An icon per filter toggle, keyed as the schema keys its toggles.
 *
 * Here rather than on the schema itself for this file's whole reason: a schema is data the shell
 * can reach, and an icon named in it would put every tab's filter glyphs in the first bundle.
 * Typed against the state's own boolean fields, so a toggle added without one fails to compile —
 * the only guard available, there being no test that can mount a component.
 */
export const filterIcons: Record<Extract<KeysMatching<FilterState, boolean>, string>, SvgIconComponent> = {
  endless: AllInclusive,
  unconfirmed: QuestionMark,
  pokemon: CatchingPokemonTwoTone,
};
