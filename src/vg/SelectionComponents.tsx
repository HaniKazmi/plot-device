import { Select, MenuItem } from "@mui/material";

export const CheckBox = ({
  label,
  value,
  setValue,
}: {
  label: string;
  value: boolean;
  setValue: (func: boolean) => void;
}) => (
  <label>
    {label}:
    <input name={label} type="checkbox" checked={value} onChange={() => setValue(!value)} />
  </label>
);

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
