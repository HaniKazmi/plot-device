import { Animation, Block, Functions, Timer } from "@mui/icons-material";
import { genreToColour } from "../utils/types";
import { networkToColour, typeToColour, type Show, type Type } from "./types";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import type { FilterDispatch, FilterState } from "./filterUtils";

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Show[] }) => (
  <FilterDrawer
    measureIcon={state.measure === "Episodes" ? <Functions /> : <Timer />}
    onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
    onReset={() => dispatch({ type: "resetFilters" })}
    toggles={
      <>
        <FilterToggle
          label="abandoned"
          icon={Block}
          checked={state.abandoned}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "abandoned", value: checked })}
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
          options={categoryOptions(data, (show) => show.genre)}
          selected={state.genre}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
          colourFor={genreToColour}
        />
        <FilterCategory
          label="network"
          options={categoryOptions(data, (show) => show.network)}
          selected={state.network}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "network", value })}
          colourFor={(value) => networkToColour({ network: value }) || undefined}
        />
        <FilterCategory
          label="type"
          options={categoryOptions(data, (show) => show.type)}
          selected={state.type}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "type", value: value as Type[] })}
          colourFor={(value) => typeToColour({ type: value as Type })}
        />
        <FilterCategory
          label="franchise"
          options={franchiseOptions(
            data,
            (show) => show.franchise,
            (show) => show.name,
          )}
          selected={state.franchise}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "franchise", value })}
        />
      </>
    }
  />
);

export default Filter;
