import { MenuItem, Select, ToggleButton, ToggleButtonGroup } from "@mui/material";
import type { ReactNode } from "react";

/**
 * The other control a section header carries: one of a few views, each an icon.
 *
 * A sibling of `SelectBox` rather than a copy per section, because two of them now sit in adjacent
 * cards on one page — a change to the borderless treatment or the a11y wiring has to reach both or
 * they stop reading as the same control. Icons rather than a select where the options are few and
 * each has a picture; a select where they are words.
 */
export const IconToggleGroup = <T extends string>({
  options,
  value,
  setValue,
  render,
}: {
  options: readonly T[];
  value: T;
  setValue: (value: T) => void;
  /** How an option reads and what it is drawn as. */
  render: (option: T) => { label: string; icon: ReactNode };
}) => (
  <ToggleButtonGroup
    color="primary"
    value={value}
    exclusive
    // Null arrives when the current option is pressed again, which would otherwise clear a control
    // that has no cleared state to fall to.
    onChange={(_, next: T | null) => next && setValue(next)}
  >
    {options.map((option) => (
      <ToggleButton
        key={option}
        value={option}
        aria-label={render(option).label}
        sx={{ border: 0 }}
      >
        {render(option).icon}
      </ToggleButton>
    ))}
  </ToggleButtonGroup>
);

export const SelectBox = <T extends string>({
  options,
  value,
  setValue,
}: {
  options: readonly T[];
  value: T;
  setValue: (func: T) => void;
}) => (
  <Select
    variant="standard"
    value={value}
    onChange={(event) => setValue(event.target.value as T)}
  >
    {options.map((option) => (
      <MenuItem
        key={option}
        value={option}
      >
        {option}
      </MenuItem>
    ))}
  </Select>
);
