import { useState } from "react";
import { SelectBox } from "./SelectionComponents";

export const useSelectBox = <T extends string>(options: readonly T[], defaultOption: T) => {
  const [value, setValue] = useState<T>(defaultOption);
  return [
    value,
    <SelectBox
      options={options}
      value={value}
      setValue={setValue}
    />,
  ] as const;
};
