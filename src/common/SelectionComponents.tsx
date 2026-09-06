import { ArrowDropDown, ChevronRight } from "@mui/icons-material";
import {
  Box,
  Button,
  Divider,
  Menu,
  MenuItem,
  Popover,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
  type Theme,
} from "@mui/material";
import { useState } from "react";
import { keyLabel } from "../utils/stringUtils";
import type { artworkPalette } from "./artworkPalette";
import { segments } from "./segments";
import { CURRENT_YEAR, type YearNumber } from "./date";
import type { YearType } from "./filterReducer";
import { isAllTime, scopeLabel } from "./scope";

/** One segment: the value it selects and the word on it. */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * One of a few named states, as words rather than pictures.
 *
 * The app says "change how this is drawn" on the barchart's views, the gallery's sort order and
 * each tab's measure, and those are the same kind of choice: a small closed set where the current
 * one has to be readable at a glance. An icon states it in a picture the reader has to already
 * know — a Σ for "count the items" is a legend nothing on the page teaches — where a word states
 * it outright, and the same shape used for all three is what makes the second one recognisable.
 *
 * Always `small`: every caller wants the compact size, and a control whose height varied between
 * the header it sits in and the rail it sits in would read as two controls.
 */
export const SegmentedControl = <T extends string>(props: {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  /** What the group of segments is choosing between — the words alone do not say. */
  ariaLabel: string;
  /**
   * The tones of the surface the control stands on, for one drawn inside a card the artwork has
   * coloured. The theme's primary is solved against the theme's paper and nothing else, so on a
   * sampled ground the lit segment can land a hue away from legible — a teal on a brown card. The
   * lit segment is then filled with the surface's ink and its word set in the ground, which is the
   * strongest pair the surface has, and the unlit words stand in the ink at full strength: the
   * muted tone is a transparent ink, and on a mid-toned artwork ground the two differ by too little
   * for a 12px word to carry.
   */
  tone?: SegmentTone;
}) => (
  <ToggleButtonGroup
    color="primary"
    size="small"
    value={props.value}
    exclusive
    aria-label={props.ariaLabel}
    // Null arrives when the current option is pressed again, which would otherwise clear a control
    // that has no cleared state to fall to.
    onChange={(_, next: T | null) => next && props.onChange(next)}
  >
    {props.options.map((option) => (
      <ToggleButton
        key={option.value}
        value={option.value}
        sx={props.tone && toneSx(props.tone)}
      >
        {option.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

/** The tones a segment reads in on a coloured surface: the surface's own palette, or the part of it used. */
export type SegmentTone = Pick<ReturnType<typeof artworkPalette>, "ground" | "onGround" | "line" | "tile">;

const toneSx = (tone: SegmentTone) => ({
  color: tone.onGround,
  borderColor: tone.line,
  // The theme grounds an unlit segment in the paper, which on an artwork-coloured card is a white
  // rectangle inside a brown one; the surface's own ground is what the rest of the card stands on.
  backgroundColor: tone.ground,
  // An unlit segment tapped on a touch screen keeps the hovered wash until the next tap lands
  // somewhere else, which reads as two segments lit at once — so the hover is stated for a
  // pointer alone, and reset to the surface's ground for everything else.
  "&:hover": { backgroundColor: tone.ground },
  "@media (hover: hover)": { "&:hover": { backgroundColor: tone.tile } },
  "&.Mui-selected, &.Mui-selected:hover": { color: tone.ground, backgroundColor: tone.onGround },
});

/**
 * The page's measure, in the section rail. The unit every figure on the tab is counted in, stated
 * as words rather than as an unlabelled icon on a floating button; it rides the rail because it
 * governs the whole page rather than any one card, and the rail is the only control surface still
 * on screen wherever the reader has scrolled to. `dispatch` is the domain's own filter dispatch,
 * typed to the one action this control sends.
 */
export const MeasureControl = <M extends string>({
  measures,
  value,
  dispatch,
}: {
  measures: readonly M[];
  value: M;
  dispatch: (action: { type: "measure"; measure: M }) => void;
}) => (
  <SegmentedControl
    options={segments(measures)}
    value={value}
    onChange={(measure) => dispatch({ type: "measure", measure })}
    ariaLabel="Measure"
  />
);

/**
 * What the picker is choosing, set beside the value it holds. Muted and a size down, because the
 * value is the answer and the label is only what the question was: at one size and one tone the
 * two read as a phrase — "Split Status" — rather than as a field and its contents.
 */
const PICKER_LABEL_SX = { fontSize: 11, fontWeight: 400, color: "text.secondary", marginRight: 0.75 } as const;

const PICKER_SX = {
  // The value in the ink, on the kit's own edge: the divider the cards and the rail are ruled off
  // in, not the half-strength primary MUI outlines a button with. A picker is a container for
  // whatever the reader chose, so the accent is kept for saying that the choice is no longer the
  // page's own default.
  //
  // Here rather than on the theme's own small outlined button, because the lit state below has to
  // override it: a `variants` rule in `theme.components` is resolved after the `sx` on the same
  // element, so the pair would answer the theme and not the call site.
  color: "text.primary",
  borderColor: "divider",
  backgroundColor: "background.paper",
  // A picker's value is one phrase: wrapped, "All time" is two lines in a control the kit gives
  // one line's height, and the caret is left beside the second of them.
  whiteSpace: "nowrap",
  // The caret is the one part of the control that is not a word, so it takes the label's tone and
  // sits closer to the value than MUI's own icon spacing puts it.
  "& .MuiButton-endIcon": {
    marginLeft: 0.25,
    marginRight: -0.5,
    color: "text.secondary",
    "& > *:first-of-type": { fontSize: 18 },
  },
} as const;

/** The same control, saying its value is no longer the one the card was written for. */
const PICKER_LIT_SX = {
  borderColor: "primary.main",
  color: "primary.main",
  backgroundColor: (theme: Theme) => `rgba(${theme.vars.palette.primary.mainChannel} / 0.08)`,
} as const;

/**
 * The picker's face: what the reader chose, what the choice was about, and a caret.
 *
 * A button opening a surface rather than a select, because a select is a form field — an
 * underlined value on a line, sized by MUI's input metrics — where every one of these is a chart
 * or page control standing beside segments in a header or the rail. As a button it takes the
 * kit's own height, type and corner, so a row holding both reads as one set of controls rather
 * than as a form beside them.
 *
 * The face is stated once and the surface behind it is the caller's, because the two pickers here
 * open different things — a list of values, and a small popover holding two controls — while
 * reading identically. `lit` is what neither can say by its value alone: that the value is no
 * longer the one every other reading of the page assumes.
 *
 * `onOpen` takes the element rather than reading the event, since what a menu or popover anchors
 * to is the button itself and the caller is the one holding that state.
 *
 * Exported for the phone's page chip, whose surface is a bottom sheet held open in a store and
 * anchored to nothing: the face is the same control, so it is drawn by the same component rather
 * than by a second one that could come to differ from it.
 */
export const PickerButton = ({
  label,
  value,
  lit,
  open,
  ariaLabel,
  onOpen,
}: {
  label?: string;
  value: string;
  lit: boolean;
  open: boolean;
  /** What the control is, where its own label does not say — a face carrying a value alone. */
  ariaLabel?: string;
  onOpen: (anchor: HTMLElement) => void;
}) => (
  <Button
    size="small"
    variant="outlined"
    aria-haspopup="true"
    aria-expanded={open}
    aria-label={ariaLabel ?? (label ? `${label}: ${value}` : undefined)}
    onClick={(event) => onOpen(event.currentTarget)}
    endIcon={<ArrowDropDown />}
    sx={lit ? { ...PICKER_SX, ...PICKER_LIT_SX } : PICKER_SX}
  >
    {label && (
      <Box
        component="span"
        sx={PICKER_LABEL_SX}
      >
        {label}
      </Box>
    )}
    {value}
  </Button>
);

/**
 * A choice out of an open set, or one a label has to name: the kit's picker over a list of values.
 *
 * `labelFor` is how a caller whose options are model keys says what each one reads as; left off,
 * the app's own humaniser answers, so `startDate` reads "Start date" and a worded option is
 * returned unchanged. `label` names what is being chosen where the card's title does not.
 *
 * `defaultValue` is what the page opens on. Given, the control lights when the reader has moved
 * off it.
 */
export const SelectBox = <T extends string>({
  options,
  value,
  setValue,
  labelFor,
  label,
  defaultValue,
}: {
  options: readonly T[];
  value: T;
  setValue: (func: T) => void;
  labelFor?: (option: T) => string;
  label?: string;
  defaultValue?: T;
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const read = (option: T) => (labelFor ? labelFor(option) : keyLabel(option));

  return (
    <>
      <PickerButton
        label={label}
        value={read(value)}
        lit={defaultValue !== undefined && value !== defaultValue}
        open={anchor !== null}
        onOpen={setAnchor}
      />
      <Menu
        anchorEl={anchor}
        open={anchor !== null}
        onClose={() => setAnchor(null)}
      >
        {options.map((option) => (
          <MenuItem
            key={option}
            // Which is current, and what the menu opens focused on: a list of a dozen genres is
            // otherwise entered at the top whatever the reader picked last.
            selected={option === value}
            onClick={() => {
              setValue(option);
              setAnchor(null);
            }}
          >
            {read(option)}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

/**
 * Typed as exactly the two actions this control sends, so every domain's dispatch — each a
 * `FilterDispatchFor` over its own wider state — fits structurally without a generic.
 */
type YearDispatch = (
  action: { type: "updateFilter"; filter: "yearTo"; value: YearNumber } | { type: "yearType"; yearType: YearType },
) => void;

/** The two readings of a year: everything up to it, or that year alone. */
const SCOPE_SEGMENTS: SegmentOption<YearType>[] = [
  { value: "upto", label: "Up to" },
  { value: "matching", label: "In" },
];

/**
 * The page's year scope, in the section rail beside the measure. Which years the whole tab is
 * counting — every row up to a year, or one year alone — as a picker reading "All time",
 * "In 2026" or "Up to 2019".
 *
 * It rides the rail for the measure's own reason: the scope narrows the vitals, the charts, the
 * timeline and the library alike, and the rail is the only control surface still on screen
 * wherever the reader has scrolled to — a control standing beside the two cards it most visibly
 * changes cannot be found from the wall, which is where a reader notices the page is a subset.
 *
 * The menu holds the two scopes a reader asks for by name and sends the rest to a popover: every
 * year the sheets cover is thirty items, where the whole library and the year in progress are
 * almost every use of the control. The popover is the full state — which reading, and which year
 * — because the two are one choice and a menu cannot hold a control.
 *
 * Lit whenever the page is not reading everything, since a picker cannot otherwise say that the
 * figures below it are a subset. It lights itself rather than being counted by the filter badge:
 * the badge counts the fields the filter surface holds, and a control that says on its own face
 * that it is on would be stated twice.
 */
export const ScopeControl = ({
  yearTo,
  yearType,
  earliestYear,
  label,
  dispatch,
}: {
  yearTo: YearNumber;
  yearType: YearType;
  /**
   * What the picker's face says it is choosing, where its surface does not. The rail needs it —
   * "All time" beside three measure words says nothing about what is all — and a labelled row in
   * the box's own labelled row has already said it, where repeating it reads as "Years Years".
   */
  label?: string;
  /**
   * The oldest year on offer. The sheets start in different years and one of them (Games) has no
   * fixed epoch at all, so no floor here would be right for every tab — each works out its own
   * from its whole library rather than from what the filters left, or picking "In 2020" would
   * strand the reader at 2020 by making that year the earliest on offer.
   */
  earliestYear: YearNumber;
  dispatch: YearDispatch;
}) => {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  // Which surface the one anchor is holding. The menu hands over to the popover in place, so the
  // button they both hang off is the same element and only one of them is open at a time.
  const [pickingYear, setPickingYear] = useState(false);

  const close = () => {
    setAnchor(null);
    setPickingYear(false);
  };

  const setScope = (year: YearNumber, type: YearType) => {
    dispatch({ type: "updateFilter", filter: "yearTo", value: year });
    dispatch({ type: "yearType", yearType: type });
    close();
  };

  const years = Array.from({ length: CURRENT_YEAR - earliestYear + 1 }, (_, index) => String(CURRENT_YEAR - index));

  return (
    <>
      <PickerButton
        label={label}
        value={scopeLabel(yearTo, yearType, CURRENT_YEAR)}
        // Named whether or not the face carries the word, since a button reading "All time" alone
        // says nothing about what is being counted.
        ariaLabel={`Years: ${scopeLabel(yearTo, yearType, CURRENT_YEAR)}`}
        lit={!isAllTime(yearTo, yearType, CURRENT_YEAR)}
        open={anchor !== null}
        onOpen={setAnchor}
      />
      <Menu
        anchorEl={anchor}
        open={anchor !== null && !pickingYear}
        onClose={close}
      >
        <MenuItem
          selected={isAllTime(yearTo, yearType, CURRENT_YEAR)}
          onClick={() => setScope(CURRENT_YEAR, "upto")}
        >
          All time
        </MenuItem>
        <MenuItem
          selected={yearType === "matching" && yearTo === CURRENT_YEAR}
          onClick={() => setScope(CURRENT_YEAR, "matching")}
        >
          In {CURRENT_YEAR}
        </MenuItem>
        <Divider />
        <MenuItem
          // Marked where the page is scoped to a year the two items above do not name, so a
          // reader opening the menu on "Up to 2019" is told which line their scope came from.
          selected={yearTo !== CURRENT_YEAR}
          onClick={() => setPickingYear(true)}
        >
          Another year…
        </MenuItem>
      </Menu>
      <Popover
        anchorEl={anchor}
        open={anchor !== null && pickingYear}
        onClose={close}
        anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
      >
        <Stack sx={{ padding: 1.5, gap: 1 }}>
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
            Another year
          </Typography>
          <Stack
            direction="row"
            sx={{ gap: 1, alignItems: "center" }}
          >
            <SegmentedControl
              options={SCOPE_SEGMENTS}
              value={yearType}
              onChange={(next) => dispatch({ type: "yearType", yearType: next })}
              ariaLabel="Year reading"
            />
            <SelectBox
              options={years}
              value={String(yearTo)}
              // The years are already the words on them, where the app's humaniser would take a
              // capital to a digit.
              labelFor={(year) => year}
              setValue={(year) =>
                dispatch({ type: "updateFilter", filter: "yearTo", value: Number(year) as YearNumber })
              }
            />
          </Stack>
        </Stack>
      </Popover>
    </>
  );
};

/**
 * The kit's edge, on a button the theme leaves unbordered: `MuiButton`'s small size states the
 * height, type and corner and nothing about `outlined`, whose default is a half-strength primary.
 * The same divider the cards and the rail are ruled off in, so a worded action reads as one more
 * of the row's controls rather than as the one call to action in the header.
 */
const CUT_SX = {
  color: "text.primary",
  borderColor: "divider",
  backgroundColor: "background.paper",
  // The chevron says which way the layer arrives from; it is punctuation on the figure rather
  // than a second mark, so it takes the muted tone and sits close to the word.
  "& .MuiButton-endIcon": {
    marginLeft: 0.25,
    marginRight: -0.5,
    color: "text.secondary",
    "& > *:first-of-type": { fontSize: 18 },
  },
} as const;

/**
 * The worded cut: "All 1,539 ›", the control a list wears where it shows fewer than it holds.
 *
 * The figure is the button because what is missing and the way to it are one fact — an ⤢ beside a
 * header reading "10 of 1,539" states the cut twice and offers it once, and says nothing about
 * how much is behind the icon. Where nothing is cut the caller keeps the ⤢ instead: there is no
 * figure to word, only a bigger view of the same thing.
 *
 * The label is `common/population.ts`'s `all`, so a shelf's handle, a group card's footer and a
 * card header's own toggle cannot spell the same sentence three ways.
 */
export const CutButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
  <Button
    size="small"
    variant="outlined"
    onClick={onClick}
    endIcon={<ChevronRight />}
    sx={CUT_SX}
  >
    {label}
  </Button>
);
