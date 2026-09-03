import { Animation, Functions, StarBorder, Timer, Weekend } from "@mui/icons-material";
import { ageRatingToColour, genreToColour, type AgeRating } from "../utils/types";
import type { Movie } from "./types";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import type { FilterDispatch, FilterState } from "./filterUtils";
import { useScheme } from "../common/useScheme";

const toggles = [
  { toggle: "home", label: "Watched at home", Icon: Weekend },
  { toggle: "unscored", label: "Unscored films", Icon: StarBorder },
  { toggle: "anime", label: "Anime", Icon: Animation },
] as const;

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Movie[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      measureIcon={state.measure === "Films" ? <Functions /> : <Timer />}
      onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={toggles.map(({ toggle, label, Icon }) => (
        <FilterToggle
          key={toggle}
          label={label}
          icon={Icon}
          checked={state[toggle]}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: toggle, value: checked })}
        />
      ))}
      categories={
        <>
          <FilterCategory
            label="genre"
            options={categoryOptions(data, (movie) => movie.genre)}
            selected={state.genre}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
            colourFor={(value) => genreToColour(value, scheme)}
          />
          <FilterCategory
            label="rating"
            options={categoryOptions(data, (movie) => movie.rating)}
            selected={state.rating}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "rating", value: value as AgeRating[] })}
            colourFor={(value) => ageRatingToColour(value as AgeRating, scheme)}
          />
          <FilterCategory
            label="director"
            options={categoryOptions(data, (movie) => movie.director)}
            selected={state.director}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "director", value })}
          />
          <FilterCategory
            label="franchise"
            options={franchiseOptions(
              data,
              (movie) => movie.franchise,
              (movie) => movie.name,
            )}
            selected={state.franchise}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "franchise", value })}
          />
        </>
      }
    />
  );
};

export default Filter;
