import { Predicate } from "../utils/types";
import { Measure, Platform, VideoGame } from "./types";
import { CURRENT_YEAR, Year } from "../common/date";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
} from "../common/filterReducer";

export type { YearType };

export interface FilterState extends BaseFilterState<VideoGame, Measure> {
  endless: boolean;
  pokemon: boolean;
  unconfirmed: boolean;
  franchise: string[];
  platform: Platform[];
  genre: string[];
  publisher: string[];
}

export type FilterDispatch = FilterDispatchFor<FilterState>;

const filters = (state: Omit<FilterState, "filter">): Predicate<VideoGame> => {
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

  if (state.franchise.length > 0) predicates.push((vg) => state.franchise.includes(vg.franchise));
  if (state.platform.length > 0) predicates.push((vg) => state.platform.includes(vg.platform));
  if (state.genre.length > 0) predicates.push((vg) => state.genre.includes(vg.genre));
  if (state.publisher.length > 0) predicates.push((vg) => state.publisher.includes(vg.publisher));

  predicates.push(...yearPredicates<VideoGame>(state));

  if (state.guestMode) {
    predicates.push((vg) => !vg.theme.includes("Adult"));
  }

  return (vg: VideoGame) => predicates.every((p) => p(vg));
};

export const { useFilterReducer } = createFilterReducer<VideoGame, Measure, FilterState>(
  {
    endless: true,
    pokemon: true,
    unconfirmed: true,
    franchise: [],
    platform: [],
    genre: [],
    publisher: [],
    measure: "Games",
    yearType: "upto",
    yearTo: CURRENT_YEAR,
    guestMode: false,
  },
  filters,
  (measure) => (measure === "Games" ? "Hours" : "Games"),
);
