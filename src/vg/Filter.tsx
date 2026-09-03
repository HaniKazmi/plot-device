import { AllInclusive, CatchingPokemonTwoTone, QuestionMark } from "@mui/icons-material";
import { platformToColor, type Platform, type VideoGame } from "./types";
import { genreToColour } from "../utils/types";
import { useScheme } from "../common/useScheme";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import { vgFranchise } from "./franchiseContext";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";

const toggles = [
  { toggle: "endless", Icon: AllInclusive },
  { toggle: "unconfirmed", Icon: QuestionMark },
  { toggle: "pokemon", Icon: CatchingPokemonTwoTone },
] as const;

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: VideoGame[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
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
            colourFor={(value) => platformToColor(value as Platform, scheme)}
          />
          <FilterCategory
            label="genre"
            options={categoryOptions(data, (vg) => vg.genre)}
            selected={state.genre}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
            // The ramp Shows and Movies share, muted — the same treatment this tab's genre charts
            // take, so a chip and a wedge naming one genre are one colour.
            colourFor={(value) => genreToColour(value, scheme)}
          />
          <FilterCategory
            label="gameplay"
            options={categoryOptions(data, (vg) => vg.gameplay)}
            selected={state.gameplay}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "gameplay", value })}
          />
          <FilterCategory
            label="publisher"
            options={categoryOptions(data, (vg) => vg.publisher)}
            selected={state.publisher}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "publisher", value })}
          />
          <FilterCategory
            label="franchise"
            options={franchiseOptions(data, vgFranchise, (vg) => vg.name)}
            selected={state.franchise}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "franchise", value })}
          />
        </>
      }
    />
  );
};

export default Filter;
