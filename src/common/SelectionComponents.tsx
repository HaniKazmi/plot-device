import { MenuItem, Select, ToggleButton, ToggleButtonGroup } from "@mui/material";

/** One segment: the value it selects and the word on it. */
export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A segment's own type. 12px because the control sits in a card header beside a title and in the
 * section rail beside 22px chips, and the button's own size would stand taller than either;
 * `textTransform: none` because the labels arrive worded — "Start date", not "Start Date".
 */
const SEGMENT_SX = { fontSize: 12, textTransform: "none", paddingY: 0.5, paddingX: 1.25 } as const;

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
        sx={SEGMENT_SX}
      >
        {option.label}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

/**
 * A select over a small set of values.
 *
 * `labelFor` is how a caller whose options are model keys rather than words says what each one
 * reads as. It carries `textTransform: none` with it, on the select and on every item: the theme
 * capitalises both so that a bare key like `genre` reads as a word, and that same rule turns a
 * worded label into Title Case — "Start Date" for a label that says "Start date". The menu is
 * portalled, so the item override cannot be inherited from the root and has to be stated twice.
 */
export const SelectBox = <T extends string>({
  options,
  value,
  setValue,
  labelFor,
}: {
  options: readonly T[];
  value: T;
  setValue: (func: T) => void;
  labelFor?: (option: T) => string;
}) => (
  <Select
    variant="standard"
    value={value}
    sx={labelFor && { textTransform: "none" }}
    onChange={(event) => setValue(event.target.value as T)}
  >
    {options.map((option) => (
      <MenuItem
        key={option}
        value={option}
        sx={labelFor && { textTransform: "none" }}
      >
        {labelFor ? labelFor(option) : option}
      </MenuItem>
    ))}
  </Select>
);
