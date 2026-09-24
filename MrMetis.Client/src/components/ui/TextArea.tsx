import React, { ComponentProps } from "react";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";

type ITextAreaProps<T extends FieldValues> = IFieldProps &
  IBindProps<T> &
  Omit<ComponentProps<"textarea">, "className" | "name">;

const TextArea = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  className,
  ...textareaProps
}: ITextAreaProps<T>) => (
  <Bound name={name} control={control}>
    {(field, fieldError) => (
      <Field
        {...{ label, required, horizontal, className }}
        error={error ?? fieldError}
      >
        <textarea
          name={name}
          aria-required={required}
          {...textareaProps}
          {...(field && {
            ref: field.ref,
            onBlur: field.onBlur,
            value: field.value ?? "",
            onChange: (e) => field.onChange(e.currentTarget.value),
          })}
        />
      </Field>
    )}
  </Bound>
);

export default TextArea;
