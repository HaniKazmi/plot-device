import { useState } from "react";
import { SelectBox } from "./SelectionComponents";

/**
 * A picker and the value it holds, for a caller whose choice is its own state and nothing else's.
 *
 * The default is handed down as well as held, so the control lights once the reader has moved off
 * it: what a card opens on is what its title and the figures beside it were written for, and a
 * chart redrawn on some other grouping is worth saying on the control that redrew it.
 */
export const useSelectBox = <T extends string>(options: readonly T[], defaultOption: T, label?: string) => {
  const [value, setValue] = useState<T>(defaultOption);
  return [
    value,
    <SelectBox
      options={options}
      value={value}
      setValue={setValue}
      defaultValue={defaultOption}
      label={label}
    />,
  ] as const;
};
