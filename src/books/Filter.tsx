import { FilterCategories, FilterToggles } from "../common/FilterControls";
import { FilterDrawer } from "../common/FilterDrawer";
import { useScheme } from "../common/useScheme";
import { bookFilters } from "./filters";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { filterIcons } from "./module.lazy";
import type { Book } from "./types";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Book[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={
        <FilterToggles
          schema={bookFilters}
          icons={filterIcons}
          state={state}
          dispatch={dispatch}
        />
      }
      categories={
        <FilterCategories
          schema={bookFilters}
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
