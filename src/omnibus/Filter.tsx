import { AutoStories, LocalMovies, Tv, VideogameAsset, type SvgIconComponent } from "@mui/icons-material";
import { FilterCategories, FilterToggles } from "../common/FilterControls";
import { FilterDrawer } from "../common/FilterDrawer";
import { useScheme } from "../common/useScheme";
import type { Medium } from "../utils/types";
import type { OmniItem } from "../common/medium";
import { omniFilters } from "./filters";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";

/**
 * An icon per medium switch. Held here rather than beside the schema for the reason every domain's
 * are held in its lazy half: a schema is data the shell can reach, and an icon named in it would
 * put these four in the first bundle a visitor downloads. This tab is not a medium and has no
 * module to hang them off, so its own lazily-loaded filter component is where they sit.
 */
const filterIcons: Record<Medium, SvgIconComponent> = {
  game: VideogameAsset,
  show: Tv,
  movie: LocalMovies,
  book: AutoStories,
};

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: OmniItem[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={
        <FilterToggles
          schema={omniFilters}
          icons={filterIcons}
          state={state}
          dispatch={dispatch}
        />
      }
      categories={
        <FilterCategories
          schema={omniFilters}
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
