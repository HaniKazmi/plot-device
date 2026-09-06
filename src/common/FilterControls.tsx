import type { SvgIconComponent } from "@mui/icons-material";
import { FilterCategory, FilterDrawer, FilterToggle } from "./FilterDrawer";
import type { YearNumber } from "./date";
import type { FilterDispatchFor, PageDispatch, PageState } from "./filterReducer";
import { MeasureControl, ScopeControl } from "./SelectionComponents";
import { categoryValues, type FilterSchema } from "./filterSchema";
import { useScheme } from "./useScheme";
import type { Scheme } from "../utils/types";

/**
 * The controls a `FilterSchema` describes, drawn once for every surface that offers filters.
 *
 * Two components rather than one, because the drawer takes its toggles and its categories as two
 * slots with its own Clear/Close row between them in DOM order — and because the two are laid out
 * differently wherever they are drawn, a row of chips over a grid of selects.
 *
 * A schema is a domain's data and knows nothing about MUI; these read it and know nothing about
 * any domain. What crosses between them is a key, a label, an accessor and a colour — which is
 * what lets one page's filters be drawn in a drawer, in the box above the page, or both, with no
 * surface holding a second opinion about what this tab can be narrowed by.
 *
 * The icons arrive as a record keyed by the same toggle keys rather than on the schema itself: a
 * schema is reachable from the shell, and an icon named there lands in the first bundle a visitor
 * downloads. Each medium's icons sit in its lazy half, which is where the surface drawing them is.
 *
 * A key is checked against the field it names where the schema is written; reading that field back
 * out of a generic state, and naming it in an action typed from that state, are lookups TypeScript
 * cannot reduce — so the assertions are here, in the one place that draws every domain's schema,
 * rather than in each domain's own file.
 */
const FilterToggles = <T, S>({
  schema,
  icons,
  state,
  dispatch,
}: {
  schema: FilterSchema<T, S>;
  icons: Record<string, SvgIconComponent>;
  state: Omit<S, "filter">;
  dispatch: FilterDispatchFor<S>;
}) => {
  const fields = state as Record<string, unknown>;

  return (
    <>
      {schema.toggles.map((toggle) => (
        <FilterToggle
          key={toggle.key}
          label={toggle.label}
          icon={icons[toggle.key]}
          checked={Boolean(fields[toggle.key])}
          onChange={(checked) =>
            dispatch({ type: "updateFilter", filter: toggle.key as keyof S, value: checked as S[keyof S] })
          }
        />
      ))}
    </>
  );
};

/** The schema's multi-selects, each over the values `categoryValues` answers for it. */
const FilterCategories = <T, S>({
  schema,
  state,
  dispatch,
  data,
  scheme,
}: {
  schema: FilterSchema<T, S>;
  state: Omit<S, "filter">;
  dispatch: FilterDispatchFor<S>;
  data: readonly T[];
  scheme: Scheme;
}) => {
  const fields = state as Record<string, unknown>;

  // Two maps rather than one, because they are keyed on different things. A category's options are
  // a pass over the whole library — a `Set` of every row's value, sorted — and depend on the data
  // and the schema alone, so hoisted they survive every dispatch the drawer makes. Computed inside
  // the map below they would be part of a value the state is a dependency of, and each of a
  // library's fifteen lists would be rebuilt on every chip pressed.
  const options = schema.categories.map((category) => categoryValues(category, data));

  return (
    <>
      {schema.categories.map((category, index) => {
        // Read out before the closure: a category with no colour vocabulary passes the prop
        // undefined rather than a function answering undefined, so it keeps the plain chips it has.
        const colourFor = category.colourFor;

        return (
          <FilterCategory
            key={category.key}
            label={category.label}
            options={options[index]}
            selected={fields[category.key] as readonly string[]}
            onChange={(value) =>
              dispatch({ type: "updateFilter", filter: category.key as keyof S, value: value as S[keyof S] })
            }
            colourFor={colourFor && ((value) => colourFor(value, scheme))}
          />
        );
      })}
    </>
  );
};

/**
 * A page's whole filter surface, from its schema: the drawer, the toggles in it and the selects
 * under them, for every tab there is.
 *
 * One component rather than one per tab, because what a tab actually varies is its schema, its
 * icons and its records — and a copy per domain is five files that can drift in what a drawer does
 * with a filter, where the filters themselves are already stated as data. The state and the
 * dispatch are the tab's own, so the drawer sets exactly what the charts beside it read.
 *
 * Both type parameters are inferred from the schema, which is what keeps the state, the dispatch
 * and the data at the call site checked against the tab whose filters are being drawn.
 *
 * The page's own measure and years are drawn here too, at the widths the rail has no room for them
 * (`SectionRail`). They are not filters, but they are page-wide readings and this is the surface a
 * narrow screen offers them on — and they are built here rather than handed down as nodes, so a
 * tab states its measures and its earliest year once instead of assembling the same two controls
 * for the rail and for the drawer.
 *
 * Both fields are on `BaseFilterState`, which every tab's state extends, so they are read and set
 * through the erasure a surface above a tab already uses (`PageState`/`PageDispatch`) rather than
 * out of the generic `S` a schema is written against.
 */
export const SchemaFilterDrawer = <T, S>({
  schema,
  icons,
  state,
  dispatch,
  data,
  activeCount,
  population,
  measures,
  earliestYear,
  onReset,
}: {
  schema: FilterSchema<T, S>;
  icons: Record<string, SvgIconComponent>;
  state: Omit<S, "filter">;
  dispatch: FilterDispatchFor<S>;
  data: readonly T[];
  activeCount: number;
  population: string;
  measures: readonly string[];
  earliestYear: YearNumber;
  onReset: () => void;
}) => {
  const scheme = useScheme();
  const page = state as Omit<PageState, "filter">;
  const pageDispatch = dispatch as PageDispatch;

  return (
    <FilterDrawer
      activeCount={activeCount}
      population={population}
      measure={
        <MeasureControl
          measures={measures}
          value={page.measure}
          dispatch={pageDispatch}
        />
      }
      scope={
        <ScopeControl
          yearTo={page.yearTo}
          yearType={page.yearType}
          earliestYear={earliestYear}
          dispatch={pageDispatch}
        />
      }
      onReset={onReset}
      toggles={
        <FilterToggles
          schema={schema}
          icons={icons}
          state={state}
          dispatch={dispatch}
        />
      }
      categories={
        <FilterCategories
          schema={schema}
          state={state}
          dispatch={dispatch}
          data={data}
          scheme={scheme}
        />
      }
    />
  );
};
