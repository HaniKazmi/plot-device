import { FilterCategories, FilterToggles } from "../common/FilterControls";
import { FilterDrawer } from "../common/FilterDrawer";
import { useScheme } from "../common/useScheme";
import { showFilters } from "./filters";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { filterIcons } from "./module.lazy";
import type { Show } from "./types";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Show[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={
        <FilterToggles
          schema={showFilters}
          icons={filterIcons}
          state={state}
          dispatch={dispatch}
        />
      }
      categories={
        <FilterCategories
          schema={showFilters}
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
