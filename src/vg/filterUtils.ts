import { Predicate } from "../utils/types";
import { Measure, Platform, VideoGame } from "./types";
import { CURRENT_YEAR, Year } from "../common/date";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
  selectedPredicates,
} from "../common/filterReducer";

export type { YearType };

export interface FilterState extends BaseFilterState<VideoGame, Measure> {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: Platform[];
  gameplay: string[];
  genre: string[];
  publisher: string[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

/**
 * Named rather than inlined into `filters` because guest mode has to be applied a second time,
 * to the franchise index built from the unfiltered data — an index that skipped it would put
 * hidden games straight back on screen through a card strip.
 */
export const guestFilter: Predicate<VideoGame> = (vg) => !vg.theme.includes("Adult");

export const filters = (state: Omit<FilterState, "filter">): Predicate<VideoGame> => {
  const predicates: Predicate<VideoGame>[] = [];

  if (!state.endless) predicates.push((vg) => vg.status !== "Endless");
  if (!state.pokemon) predicates.push((vg) => vg.franchise !== "Pokémon");
  if (!state.unconfirmed)
    predicates.push((vg) => {
      if (vg.platform === "PC") {
        if (vg.startDate instanceof Year || vg.startDate.year < 2015) return false;
      } else if (
        !["Nintendo Switch", "Nintendo Switch 2", "Nintendo 3DS", "PlayStation 4", "PlayStation 5"].includes(
          vg.platform,
        )
      ) {
        return false;
      }
      return true;
    });

  predicates.push(
    ...selectedPredicates(state.franchise, (vg: VideoGame) => vg.franchise),
    ...selectedPredicates(state.platform, (vg: VideoGame) => vg.platform),
    ...selectedPredicates(state.gameplay, (vg: VideoGame) => vg.gameplay),
    ...selectedPredicates(state.genre, (vg: VideoGame) => vg.genre),
    ...selectedPredicates(state.publisher, (vg: VideoGame) => vg.publisher),
  );

  predicates.push(...yearPredicates<VideoGame>(state));

  if (state.guestMode) {
    predicates.push(guestFilter);
  }

  return (vg: VideoGame) => predicates.every((p) => p(vg));
};

export const { useFilterReducer, reducer, initialState, activeCount } = createFilterReducer<
  VideoGame,
  Measure,
  FilterState
>(
  {
    endless: true,
    pokemon: true,
    unconfirmed: true,
    franchise: [],
    platform: [],
    gameplay: [],
    genre: [],
    publisher: [],
    measure: "Games",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
  },
  filters,
);
