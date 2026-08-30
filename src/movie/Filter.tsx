import { Animation, Functions, StarBorder, Timer, Weekend } from "@mui/icons-material";
import { ageRatingToColour, genreToColour, type AgeRating } from "../utils/types";
import type { Movie } from "./types";
import { namesTheSameThing } from "../utils/stringUtils";
import { categoryOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import type { FilterDispatch, FilterState } from "./filterUtils";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Movie[] }) => (
  <FilterDrawer
    measureIcon={state.measure === "Films" ? <Functions /> : <Timer />}
    onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
    onReset={() => dispatch({ type: "resetFilters" })}
    toggles={
      <>
        <FilterToggle
          label="home"
          icon={Weekend}
          checked={state.home}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "home", value: checked })}
        />
        <FilterToggle
          label="unscored"
          icon={StarBorder}
          checked={state.unscored}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "unscored", value: checked })}
        />
        <FilterToggle
          label="anime"
          icon={Animation}
          checked={state.anime}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "anime", value: checked })}
        />
      </>
    }
    categories={
      <>
        <FilterCategory
          label="genre"
          options={categoryOptions(data, (movie) => movie.genre)}
          selected={state.genre}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
          colourFor={genreToColour}
        />
        <FilterCategory
          label="rating"
          options={categoryOptions(data, (movie) => movie.rating)}
          selected={state.rating}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "rating", value: value as AgeRating[] })}
          colourFor={(value) => ageRatingToColour(value as AgeRating)}
        />
        <FilterCategory
          label="director"
          options={categoryOptions(data, (movie) => movie.director)}
          selected={state.director}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "director", value })}
        />
        <FilterCategory
          label="franchise"
          // Films with no wider franchise carry their own name in the column; erasing those keeps
          // the list to franchises that actually group anything.
          options={categoryOptions(data, (movie) =>
            namesTheSameThing(movie.franchise, movie.name) ? "" : movie.franchise,
          ).filter(Boolean)}
          selected={state.franchise}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "franchise", value })}
        />
      </>
    }
  />
);

export default Filter;
