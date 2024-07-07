import { Select, MenuItem } from "@mui/material";

export const SelectBox = <T extends string>({
  options,
  value,
  setValue,
}: {
  options: T[];
  value: T;
  setValue: (func: T) => void;
}) => (
  <Select variant="standard" value={value} onChange={(event) => setValue(event.target.value as T)}>
    {options.map((option) => (
      <MenuItem key={option} value={option}>
        {option}
      </MenuItem>
    ))}
  </Select>
);
