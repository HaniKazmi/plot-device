import { Functions, MenuBook, StarBorder, Timer } from "@mui/icons-material";
import { genreToColour } from "../utils/types";
import { formatToColour, type Book, type Measure } from "./types";
import { categoryOptions, franchiseOptions } from "../common/filterOptions";
import { FilterCategory, FilterDrawer, FilterToggle } from "../common/FilterDrawer";
import type { FilterDispatch, FilterState } from "./filterUtils";
import { useScheme } from "../common/useScheme";
import type { ReactNode } from "react";

/** The icon on the measure button says what the next press cycles to, as the other tabs' do. */
const measureIcons: Record<Measure, ReactNode> = {
  Books: <Functions />,
  Hours: <Timer />,
  Pages: <MenuBook />,
};

const Filter = ({ state, dispatch, data }: { state: FilterState; dispatch: FilterDispatch; data: Book[] }) => {
  const scheme = useScheme();

  return (
    <FilterDrawer
      measureIcon={measureIcons[state.measure]}
      onToggleMeasure={() => dispatch({ type: "toggleMeasure" })}
      onReset={() => dispatch({ type: "resetFilters" })}
      toggles={
        <FilterToggle
          label="Unscored books"
          icon={StarBorder}
          checked={state.unscored}
          onChange={(checked) => dispatch({ type: "updateFilter", filter: "unscored", value: checked })}
        />
      }
      categories={
        <>
          <FilterCategory
            label="genre"
            options={categoryOptions(data, (book) => book.genre)}
            selected={state.genre}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "genre", value })}
            colourFor={(value) => genreToColour(value, scheme)}
          />
          <FilterCategory
            label="format"
            options={categoryOptions(data, (book) => book.format)}
            selected={state.format}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "format", value })}
            colourFor={(value) => formatToColour(value, scheme)}
          />
          <FilterCategory
            label="author"
            options={categoryOptions(data, (book) => book.author)}
            selected={state.author}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "author", value })}
          />
          <FilterCategory
            label="series"
            // The helper keeps `""`, and a standalone book answers it: six blank chips would be one
            // that selects nothing a reader can name.
            options={categoryOptions(data, (book) => book.series).filter(Boolean)}
            selected={state.series}
            onChange={(value) => dispatch({ type: "updateFilter", filter: "series", value })}
          />
          <FilterCategory
            label="franchise"
            options={franchiseOptions(
              data,
              (book) => book.franchise,
              (book) => book.name,
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
