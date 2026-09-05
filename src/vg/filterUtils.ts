import { Platform, VideoGame } from "./types";
import { CURRENT_YEAR } from "../common/date";
import {
  createFilterReducer,
  type BaseFilterState,
  type FilterDispatchFor,
  type YearType,
} from "../common/filterReducer";
import { vgFilters } from "./filters";
import type { Measure } from "./types";

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

export const {
  store: pageState,
  useFilterReducer,
  filters,
  reducer,
  initialState,
  activeCount,
} = createFilterReducer<VideoGame, Measure, FilterState>({
  schema: vgFilters,
  initial: { measure: "Games", yearType: "upto", yearTo: CURRENT_YEAR },
  // A game counts to the year it was started, which is the year the vitals cards place it in.
  yearOf: (game) => game.startDate.year,
});
