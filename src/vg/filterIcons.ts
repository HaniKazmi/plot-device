import { AllInclusive, CatchingPokemonTwoTone, QuestionMark, type SvgIconComponent } from "@mui/icons-material";
import type { KeysMatching } from "../utils/types";
import type { FilterState } from "./filterUtils";

/**
 * An icon per filter toggle, keyed as the schema keys its toggles.
 *
 * Not on the schema itself, which is data the shell reaches: an icon named there puts every tab's
 * filter glyphs in the first bundle a visitor downloads. Not in `module.lazy.ts` either, whose two
 * components are looked up by medium — a dynamic `MEDIA_LAZY[medium]` keeps every export of every
 * medium's lazy half in the chunk the hover card is prefetched from, so a drawer's glyphs would
 * ride along with a card nobody has opened. The only importer is this tab's own `Graphs`, which is
 * where the drawer is drawn.
 *
 * Typed against the state's own boolean fields, so a toggle added without an icon fails to compile
 * — the only guard available, there being no test that can mount a component.
 */
export const filterIcons: Record<Extract<KeysMatching<FilterState, boolean>, string>, SvgIconComponent> = {
  endless: AllInclusive,
  unconfirmed: QuestionMark,
  pokemon: CatchingPokemonTwoTone,
};
