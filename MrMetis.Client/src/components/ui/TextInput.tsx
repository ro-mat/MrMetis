import React, { ComponentProps } from "react";
import Field, { IFieldProps } from "./Field";

type ITextInputProps = IFieldProps & Omit<ComponentProps<"input">, "className">;

// Text, number or password input. Spread `register("name")` into it.
const TextInput = ({
  label,
  required,
  error,
  horizontal,
  className,
  type = "text",
  ...inputProps
}: ITextInputProps) => (
  <Field {...{ label, required, error, horizontal, className }}>
    <input type={type} aria-required={required} {...inputProps} />
  </Field>
);

export default TextInput;
