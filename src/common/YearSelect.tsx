import { FormControl, MenuItem, Select } from "@mui/material";
import type { ReactNode } from "react";
import { CURRENT_YEAR, type YearNumber } from "./date";
import prepareForSlot from "../utils/prepareForSlot";

/**
 * The year dropdown a vitals card wears as its title: renders as whatever `renderValue` says —
 * "All Time", "In 2024" — and opens to every year the app tracks, newest first.
 *
 * Fully controlled, so what picking a year does is the caller's — on the tabs it drives the
 * page-wide year filter.
 */
export const YearSelect = (props: {
  value: YearNumber;
  onChange: (year: YearNumber) => void;
  renderValue: (value: number) => ReactNode;
  minWidth?: number;
  /** The oldest year on offer. The three sheets start in different years and one of them
      (Games) has no fixed epoch at all, so no floor here would be right for every caller —
      each domain works out its own and passes it down. */
  earliestYear: YearNumber;
}) => (
  <FormControl
    variant="standard"
    sx={{ minWidth: props.minWidth ?? 130, margin: 0 }}
  >
    <Select
      SelectDisplayProps={{ style: { padding: 0 } }}
      value={props.value}
      displayEmpty
      onChange={(event) => props.onChange(event.target.value as YearNumber)}
      renderValue={(value) => props.renderValue(value as number)}
      slots={{ root: prepareForSlot("span") }}
    >
      {Array.from({ length: CURRENT_YEAR - props.earliestYear + 1 }, (_, i) => CURRENT_YEAR - i).map((year) => (
        <MenuItem
          key={year}
          value={year}
        >
          {year}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
