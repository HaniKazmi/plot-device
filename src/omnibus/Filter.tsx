import { AutoStories, LocalMovies, Tv, VideogameAsset } from "@mui/icons-material";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import { genreToColour } from "../utils/types";
import type { OmniItem } from "./adapter";
import { activeCount, type FilterDispatch, type FilterState } from "./filterUtils";
import { useScheme } from "../common/useScheme";

/**
 * The medium switches, which are this tab's toggles because a medium here is what a category is
 * elsewhere: turning two off is how the reader asks the same charts a narrower question.
 *
 * Labelled in the plural where the state key is the singular medium each item carries.
 */
const toggles = [
  { toggle: "game", label: "Games", Icon: VideogameAsset },
  { toggle: "show", label: "Shows", Icon: Tv },
  { toggle: "movie", label: "Movies", Icon: LocalMovies },
  { toggle: "book", label: "Books", Icon: AutoStories },
] as const;

/**
 * Genre and franchise are the two vocabularies all four media share, and both selects are derived
 * from the union rather than from any one sheet — the entries appearing in more than one of them
 * are the point of offering the filter here at all.
 */
const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: OmniItem[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      activeCount={activeCount(state)}
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
            options={categoryOptions(data, (item) => item.genre)}
            selected={state.genre}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
            // The one ramp all three media's genres are drawn from, so a chip means the same thing
            // whichever medium's rows it is narrowing.
            colourFor={(value) => genreToColour(value, scheme)}
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
};

export default Filter;
