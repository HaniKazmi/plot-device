import { AllInclusive, CatchingPokemonTwoTone, Functions, QuestionMark, Timer } from "@mui/icons-material";
import { platformToColor, type Platform, type VideoGame } from "./types";
import { categoryOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import type { FilterDispatch, FilterState } from "./filterUtils";

const toggles = [
  { toggle: "endless", Icon: AllInclusive },
  { toggle: "unconfirmed", Icon: QuestionMark },
  { toggle: "pokemon", Icon: CatchingPokemonTwoTone },
] as const;

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: VideoGame[] }) => (
  <FilterDrawer
    measureIcon={state.measure === "Games" ? <Functions /> : <Timer />}
    onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
    onReset={() => dispatch({ type: "resetFilters" })}
    toggles={toggles.map(({ toggle, Icon }) => (
      <FilterToggle
        key={toggle}
        label={toggle}
        icon={Icon}
        checked={state[toggle]}
        onChange={(checked) => dispatch({ type: "updateFilter", filter: toggle, value: checked })}
      />
    ))}
    categories={
      <>
        <FilterCategory
          label="platform"
          options={categoryOptions(data, (vg) => vg.platform)}
          selected={state.platform}
          onChange={(value) => dispatch({ type: "updateFilter", filter: "platform", value: value as Platform[] })}
          colourFor={(value) => platformToColor(value as Platform)}
        />
        {(["genre", "publisher", "franchise"] as const).map((category) => (
          <FilterCategory
            key={category}
            label={category}
            options={categoryOptions(data, (vg) => vg[category])}
            selected={state[category]}
            onChange={(value) => dispatch({ type: "updateFilter", filter: category, value })}
          />
        ))}
      </>
    }
  />
);

export default Filter;
