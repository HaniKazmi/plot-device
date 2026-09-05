import { FilterCategories, FilterToggles } from "../common/FilterControls";
import { FilterDrawer } from "../common/FilterDrawer";
import { useScheme } from "../common/useScheme";
import { movieFilters } from "./filters";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { filterIcons } from "./module.lazy";
import type { Movie } from "./types";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Movie[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={
        <FilterToggles
          schema={movieFilters}
          icons={filterIcons}
          state={state}
          dispatch={dispatch}
        />
      }
      categories={
        <FilterCategories
          schema={movieFilters}
          state={state}
          dispatch={dispatch}
          data={data}
          scheme={scheme}
        />
      }
    />
  );
};

export default Filter;
