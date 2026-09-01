import { Functions, LocalMovies, Timer, Tv, VideogameAsset } from "@mui/icons-material";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import { genreToColour } from "../utils/types";
import type { OmniItem } from "./adapter";
import type { FilterDispatch, FilterState } from "./filterUtils";

/**
 * The medium switches are the toggles, because on this tab a medium is what a category is
 * elsewhere: turning two off is how the reader asks the same charts a narrower question.
 *
 * Genre and franchise are the two vocabularies all three media share, and are derived from the
 * union rather than from any one sheet — the point of the select is the entries that appear in
 * more than one of them.
 */
const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: OmniItem[] }) => (
  <FilterDrawer
    measureIcon={state.measure === "Hours" ? <Timer /> : <Functions />}
    onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
    onReset={() => dispatch({ type: "resetFilters" })}
    toggles={
      <>
        <FilterToggle
          label="games"
          icon={VideogameAsset}
          checked={state.game}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "game", value: checked })}
        />
        <FilterToggle
          label="shows"
          icon={Tv}
          checked={state.show}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "show", value: checked })}
        />
        <FilterToggle
          label="movies"
          icon={LocalMovies}
          checked={state.movie}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "movie", value: checked })}
        />
      </>
    }
    categories={
      <>
        <FilterCategory
          label="genre"
          options={categoryOptions(data, (item) => item.genre)}
          selected={state.genre}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
          // The one ramp all three media's genres are drawn from, so a chip means the same thing
          // whichever medium's rows it is narrowing.
          colourFor={genreToColour}
        />
        <FilterCategory
          label="franchise"
          options={franchiseOptions(
            data,
            (item) => item.franchise,
            (item) => item.name,
          )}
          selected={state.franchise}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "franchise", value })}
        />
      </>
    }
  />
);

export default Filter;
