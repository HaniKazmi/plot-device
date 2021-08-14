export const CheckBox = ({ label, value, setValue }:
                           { label: string, value: boolean, setValue: (func: boolean) => void }) => (
  <label>
    {label}:
    <input
      name={label}
      type="checkbox"
      checked={value}
      onChange={() => setValue(!value)}
    />
  </label>
);