import type { PageModule } from "../common/medium";
import type { OmniItem } from "../common/medium";
import type { Measure } from "../app/types";
import { omniFilters } from "./filters";
import { earliestYear, MEASURES, NOUN, pageState } from "./filterUtils";

/**
 * The composing tab as a page: the fifth entry beside the four media's own modules.
 *
 * A page and not a medium — there is no sheet, no artwork and no unit of its own behind it — so the
 * surfaces standing above the tabs read the same six answers here that they read off a
 * `MediumModule`, and the one file in the composing folder that names this tab looks it up rather
 * than branching on it.
 *
 * The id is a literal rather than read off its own `Tab`: `tabs.ts` imports the five entry
 * components eagerly and an entry component reaches the composing folder, so an import back would
 * evaluate this module while `tabs.ts` was still in its own temporal dead zone.
 */
export const omniPageModule: PageModule<OmniItem, Measure> = {
  tabId: "omnibus",
  noun: NOUN,
  measures: MEASURES,
  filters: omniFilters,
  pageState,
  earliestYear,
};
