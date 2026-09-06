import { Clear, ExpandMore, Search } from "@mui/icons-material";
import { Box, Chip, Divider, IconButton, InputBase, Stack, Typography, type Theme } from "@mui/material";
import { useState, type ReactNode } from "react";
import type { YearNumber } from "./date";
import type { PageDispatch, PageState } from "./filterReducer";
import { MeasureControl, ScopeControl } from "./SelectionComponents";
import { categoryTally, fieldsOf, type PageSchema } from "./filterSchema";
import { foldText } from "./searchData";
import { focusRingSx, MUTED_FIGURE_SX } from "./typography";
import { useScheme } from "./useScheme";
import { format } from "../utils/mathUtils";
import type { Colour } from "../utils/types";

/**
 * Everything a page is drawn through, as the rows the box's This page mode holds: the unit its
 * figures are counted in, the years it is scoped to, its toggles, and one expanding picker per
 * category.
 *
 * A schema is a domain's data and knows nothing about MUI; this reads one and knows nothing about
 * any domain. What crosses between them is a key, a label, an accessor and a colour — which is
 * what lets one page's filters be drawn above the page by a surface that holds five tabs' schemas
 * and no opinion about what any of them can be narrowed by.
 *
 * Every value is a tap and never a menu item: the box opens with the keyboard down, so a category
 * expands **in place** into the chips it offers rather than into a portalled list a thumb has to
 * aim at. A `searchable` category — the people and series a library holds hundreds of — opens a
 * scrolling list with a field of its own instead, since two hundred chips is not a list anyone
 * scans.
 */

/** The label column, so the controls beside labels of different lengths stand on one edge. */
const ROW_LABEL_SX = { width: 64, flexShrink: 0, color: "text.secondary" } as const;

/** A labelled row: what the setting is, and the control that sets it. */
const PageRow = ({ label, children }: { label: string; children: ReactNode }) => (
  <Stack
    direction="row"
    sx={{ alignItems: "center", flexWrap: "wrap", gap: 1, paddingY: 0.5 }}
  >
    <Typography
      variant="caption"
      sx={ROW_LABEL_SX}
    >
      {label}
    </Typography>
    {/* The controls take the column beside the label and wrap inside it: at their own width Games'
        three toggles want 450px of the 286 a phone leaves, and a box that cannot shrink wraps
        whole, leaving the word alone on its line and the chips over the screen's edge. */}
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, flex: 1, minWidth: 0 }}>{children}</Box>
  </Stack>
);

/**
 * A chip the reader presses to narrow the page: a value out of a category's vocabulary, or a
 * toggle standing for a rule of its own. One component for both, since the two are the same object
 * — a thing chosen or not — and a toggle drawn by a second one would come to differ in its filled
 * state, its edge or the height it stands at.
 *
 * The figure rides inside the chip rather than beside it: a chip is what a finger lands on, and a
 * count set outside it is a word that says something about a target it is not part of. A toggle
 * counts nothing and names no vocabulary, so it passes neither.
 */
const ValueChip = ({
  value,
  count,
  selected,
  colour,
  onToggle,
}: {
  value: string;
  /** How many rows the value holds, where the chip stands for a value in the data. */
  count?: number;
  selected: boolean;
  /** Its swatch, where the app already speaks that field's colour, so a chip and a wedge naming one value are one colour. */
  colour?: Colour;
  onToggle: () => void;
}) => (
  <Chip
    size="small"
    label={
      count === undefined ? (
        value
      ) : (
        <Box
          component="span"
          sx={{ display: "inline-flex", alignItems: "baseline", gap: 0.75 }}
        >
          {value}
          <Box
            component="span"
            sx={{ ...MUTED_FIGURE_SX, fontSize: 10.5, color: "inherit", opacity: 0.7 }}
          >
            {format(count)}
          </Box>
        </Box>
      )
    }
    color={selected ? "primary" : "default"}
    variant={selected ? "filled" : "outlined"}
    onClick={onToggle}
    aria-pressed={selected}
    sx={colourSx(colour, selected)}
  />
);

/**
 * A chip's own vocabulary colour: the fill itself once chosen, its edge alone while it is not.
 *
 * Built by a function rather than inline, so the `getContrastText` call over the chosen colour is
 * made once against a value the caller already holds.
 */
const colourSx = (colour: Colour | undefined, selected: boolean) => {
  if (!colour) return undefined;
  if (!selected) return { borderColor: colour };
  return { backgroundColor: colour, color: (theme: Theme) => theme.palette.getContrastText(colour) };
};

/**
 * A category's own row: what it is, what is chosen, and a caret saying it opens.
 *
 * The summary is the chosen values joined, or "Any" where nothing is — and, on a searchable
 * category, how long the list behind it is, since a reader deciding whether to open a franchise
 * picker wants to know it holds a hundred and sixty-eight names and a field to find one by.
 *
 * A category holding a selection ends in a clear of its own: the whole-surface Clear undoes every
 * category at once, so taking one of them back otherwise means opening the list, finding the chips
 * that are lit and pressing each of them off. It is a sibling of the row's button rather than a
 * child of it — a button inside a button is closed by the parser at the inner one, leaving the
 * label and the caret outside anything pressable.
 */
const CategoryRow = ({
  label,
  summary,
  chosen,
  open,
  dimmed,
  onToggle,
  onClear,
}: {
  label: string;
  summary: string;
  chosen: boolean;
  open: boolean;
  dimmed: boolean;
  onToggle: () => void;
  onClear: () => void;
}) => (
  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, opacity: dimmed ? 0.4 : 1 }}>
    <Box
      component="button"
      type="button"
      aria-expanded={open}
      onClick={onToggle}
      sx={(theme) => ({
        display: "flex",
        alignItems: "center",
        gap: 1,
        flex: 1,
        minWidth: 0,
        minHeight: 36,
        padding: 0,
        border: 0,
        background: "none",
        color: "inherit",
        font: "inherit",
        textAlign: "left",
        cursor: "pointer",
        ...focusRingSx(theme),
      })}
    >
      <Typography
        variant="caption"
        sx={{ ...ROW_LABEL_SX, textTransform: "capitalize" }}
      >
        {label}
      </Typography>
      <Typography
        variant="body2"
        noWrap
        sx={{ flexGrow: 1, minWidth: 0, color: chosen ? "text.primary" : "text.secondary" }}
      >
        {summary}
      </Typography>
      <ExpandMore
        fontSize="small"
        sx={{ color: "text.secondary", transform: open ? "rotate(180deg)" : undefined, flexShrink: 0 }}
      />
    </Box>
    {chosen && (
      <IconButton
        size="small"
        aria-label={`Clear ${label}`}
        onClick={onClear}
        sx={{ color: "text.secondary", flexShrink: 0 }}
      >
        <Clear fontSize="small" />
      </IconButton>
    )}
  </Box>
);

/** The field a long vocabulary is found by rather than scanned through. */
const SearchWithin = ({ label, value, onChange }: { label: string; value: string; onChange: (q: string) => void }) => (
  <Box
    sx={{
      display: "flex",
      alignItems: "center",
      gap: 1,
      paddingX: 1,
      border: 1,
      borderColor: "divider",
      borderRadius: 1,
    }}
  >
    <Search
      fontSize="small"
      sx={{ color: "text.secondary" }}
    />
    <InputBase
      fullWidth
      value={value}
      placeholder={`Find a ${label}…`}
      onChange={(event) => onChange(event.target.value)}
      inputProps={{ "aria-label": `Find a ${label}`, autoCapitalize: "off", autoCorrect: "off", spellCheck: false }}
      sx={{ fontSize: 14, paddingY: 0.5 }}
    />
  </Box>
);

/**
 * The values a category is offering: chips for a short vocabulary, the same chips over a field and
 * inside a scroller for a long one.
 *
 * The scroller is capped in height rather than in items, so what a reader cannot reach is a scroll
 * away and never a cut with nothing saying so — a chip row's own answer being that every chip it
 * holds is there.
 */
const CategoryValues = ({
  label,
  searchable,
  values,
  counts,
  selected,
  colourFor,
  onToggle,
}: {
  label: string;
  searchable: boolean;
  values: readonly string[];
  counts: Map<string, number>;
  selected: readonly string[];
  colourFor: ((value: string) => Colour | undefined) | undefined;
  onToggle: (value: string) => void;
}) => {
  const [within, setWithin] = useState("");
  const phrase = foldText(within);
  // What is chosen leads the list while a phrase narrows it, and the matches follow without
  // repeating any of it. A phrase names what the reader is looking for and not what they have
  // already picked, so a list filtered to the matches alone takes every chosen chip off the screen
  // — the only place the choice is shown, and the only place it can be taken back. With the field
  // empty the vocabulary keeps its own order, or a short list would reorder itself under a thumb
  // on every press.
  const shown =
    searchable && phrase
      ? [...selected, ...values.filter((value) => !selected.includes(value) && foldText(value).includes(phrase))]
      : values;

  const chips = (
    <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.75 }}>
      {shown.map((value) => (
        <ValueChip
          key={value}
          value={value}
          count={counts.get(value) ?? 0}
          selected={selected.includes(value)}
          colour={colourFor?.(value)}
          onToggle={() => onToggle(value)}
        />
      ))}
    </Box>
  );

  if (!searchable) return <Box sx={{ paddingBottom: 1 }}>{chips}</Box>;

  return (
    <Stack
      spacing={1}
      sx={{ paddingBottom: 1 }}
    >
      <SearchWithin
        label={label}
        value={within}
        onChange={setWithin}
      />
      <Box sx={{ maxHeight: 220, overflowY: "auto" }}>{chips}</Box>
    </Stack>
  );
};

/** What a category's row says it holds: the chosen values, or how much there is to choose from. */
const summaryOf = (chosen: readonly string[], total: number, searchable: boolean) => {
  if (chosen.length > 0) return chosen.join(", ");
  return searchable ? `Any · ${format(total)}, with a search` : "Any";
};

/**
 * A multi-select's selection with one value added or taken out.
 *
 * A new array on every real change, which is what the reducer's identity test reads as "something
 * moved" and what `countActiveFilters` compares element-wise.
 */
const toggleValue = (selected: readonly string[], value: string): string[] =>
  selected.includes(value) ? selected.filter((held) => held !== value) : [...selected, value];

/**
 * One page's whole control surface, from its schema.
 *
 * One component rather than one per tab, because what a tab actually varies is its schema, its
 * measures and its rows — and a copy per domain is five files that can drift in what a filter
 * surface does with a selection, where the filters themselves are already stated as data.
 *
 * The measure and the years lead and are ruled off from the rest: they are readings of the whole
 * page rather than narrowings of it — they change what the figures mean, where a filter changes
 * which rows there are. Both are on `BaseFilterState`, which every tab's state extends, so they
 * are read and set through the erasure a surface above a tab already uses (`PageState` /
 * `PageDispatch`) rather than out of the generic `S` a schema is written against.
 *
 * `query` is the box's own text: with something typed, every category shows the values matching it
 * and one matching none is dimmed and stays shut, so the single field narrows the lists as well as
 * the libraries.
 */
export const SchemaPageControls = ({
  schema,
  state,
  dispatch,
  data,
  measures,
  earliestYear,
  query,
}: {
  schema: PageSchema;
  state: PageState;
  dispatch: PageDispatch;
  data: readonly unknown[];
  measures: readonly string[];
  earliestYear: YearNumber;
  query: string;
}) => {
  const scheme = useScheme();
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const fields = fieldsOf(state);
  const phrase = foldText(query);

  // A pass over the whole library per category, hoisted out of the map below so a chip pressed or
  // a letter typed rebuilds no list: computed inside it, each of a library's fifteen vocabularies
  // would be part of a value the state and the query are dependencies of. The values and their
  // figures come off the one pass, the chips stating both.
  const tallies = schema.categories.map((category) => categoryTally(category, data));

  return (
    <Box sx={{ paddingX: 2, paddingY: 1 }}>
      <PageRow label="Count in">
        <MeasureControl
          measures={measures}
          value={state.measure}
          dispatch={dispatch}
        />
      </PageRow>
      <PageRow label="Years">
        <ScopeControl
          yearTo={state.yearTo}
          yearType={state.yearType}
          earliestYear={earliestYear}
          dispatch={dispatch}
        />
      </PageRow>
      {schema.toggles.length > 0 && (
        <PageRow label="Filters">
          {schema.toggles.map((toggle) => {
            const checked = Boolean(fields[toggle.key]);
            return (
              <ValueChip
                key={toggle.key}
                value={toggle.label}
                selected={checked}
                onToggle={() => dispatch({ type: "updateFilter", filter: toggle.key, value: !checked })}
              />
            );
          })}
        </PageRow>
      )}
      <Divider sx={{ marginY: 1 }} />
      {schema.categories.map((category, index) => {
        const chosen = fields[category.key] as readonly string[];
        const { values, counts } = tallies[index];
        const matching = phrase ? values.filter((value) => foldText(value).includes(phrase)) : values;
        // With something typed, a category answering it is open and one answering nothing is
        // dimmed and shut; otherwise the reader opens one at a time, two open lists on a phone
        // pushing the rest of the page below the fold.
        const open = phrase ? matching.length > 0 : openCategory === category.key;
        // Read out before the closure: a category with no colour vocabulary passes the prop
        // undefined rather than a function answering undefined, so it keeps its plain chips.
        const colourFor = category.colourFor;

        return (
          <Box key={category.key}>
            <CategoryRow
              label={category.label}
              summary={summaryOf(chosen, values.length, Boolean(category.searchable))}
              chosen={chosen.length > 0}
              open={open}
              dimmed={phrase.length > 0 && matching.length === 0}
              onToggle={() => setOpenCategory(openCategory === category.key ? null : category.key)}
              onClear={() => dispatch({ type: "updateFilter", filter: category.key, value: [] })}
            />
            {open && (
              <CategoryValues
                // Remounted when the outer query changes, so a search-within field still holding a
                // phrase the box has already narrowed past starts empty again.
                key={phrase}
                label={category.label}
                searchable={Boolean(category.searchable)}
                values={matching}
                counts={counts}
                selected={chosen}
                colourFor={colourFor && ((value: string) => colourFor(value, scheme))}
                onToggle={(value) =>
                  dispatch({ type: "updateFilter", filter: category.key, value: toggleValue(chosen, value) })
                }
              />
            )}
          </Box>
        );
      })}
    </Box>
  );
};
