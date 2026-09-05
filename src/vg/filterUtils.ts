import { Predicate } from "../utils/types";
import { Measure, Platform, VideoGame } from "./types";
import { CURRENT_YEAR } from "../common/date";
import {
  createFilterReducer,
  yearPredicates,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
} from "../common/filterReducer";
import { schemaPredicates } from "../common/filterSchema";
import { vgFilters } from "./filters";

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
 * The tab's predicate: every per-field rule the schema states, and then the year scope, which
 * belongs to no field and is a reading of the whole page rather than a narrowing of it.
 */
export const filters = (state: Omit<FilterState, "filter">): Predicate<VideoGame> => {
  const predicates: Predicate<VideoGame>[] = [
    ...schemaPredicates(vgFilters, state),
    ...yearPredicates<VideoGame>(state),
  ];

  return (vg: VideoGame) => predicates.every((p) => p(vg));
};

export const {
  store: pageState,
  useFilterReducer,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<VideoGame, Measure, FilterState>(
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
  },
  filters,
);
