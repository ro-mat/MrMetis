import React, { ComponentProps } from "react";
import Field, { IFieldProps } from "./Field";

type ITextAreaProps = IFieldProps &
  Omit<ComponentProps<"textarea">, "className">;

const TextArea = ({
  label,
  required,
  error,
  horizontal,
  className,
  ...textareaProps
}: ITextAreaProps) => (
  <Field {...{ label, required, error, horizontal, className }}>
    <textarea aria-required={required} {...textareaProps} />
  </Field>
);

export default TextArea;
