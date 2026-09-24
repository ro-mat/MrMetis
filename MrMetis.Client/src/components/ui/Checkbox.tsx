import React, { ComponentProps } from "react";
import Field, { IFieldProps } from "./Field";

type ICheckboxProps = IFieldProps &
  Omit<ComponentProps<"input">, "className" | "type">;

// Label is shown next to the box unless `horizontal={false}`.
const Checkbox = ({
  label,
  required,
  error,
  horizontal = true,
  className,
  ...inputProps
}: ICheckboxProps) => (
  <Field {...{ label, required, error, horizontal, className }}>
    <input type="checkbox" aria-required={required} {...inputProps} />
  </Field>
);

export default Checkbox;
