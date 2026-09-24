import React, { ChangeEvent, ComponentProps } from "react";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";

type ITextInputProps<T extends FieldValues> = IFieldProps &
  IBindProps<T> &
  Omit<ComponentProps<"input">, "className" | "name">;

// Number inputs store numbers (or undefined while empty) in the form.
const inputValue = (e: ChangeEvent<HTMLInputElement>) =>
  e.currentTarget.type === "number"
    ? e.currentTarget.value === ""
      ? undefined
      : e.currentTarget.valueAsNumber
    : e.currentTarget.value;

// Text, number or password input.
const TextInput = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  className,
  type = "text",
  ...inputProps
}: ITextInputProps<T>) => (
  <Bound name={name} control={control}>
    {(field, fieldError) => (
      <Field
        {...{ label, required, horizontal, className }}
        error={error ?? fieldError}
      >
        <input
          type={type}
          name={name}
          aria-required={required}
          {...inputProps}
          {...(field && {
            ref: field.ref,
            onBlur: field.onBlur,
            value: field.value ?? "",
            onChange: (e) => field.onChange(inputValue(e)),
          })}
        />
      </Field>
    )}
  </Bound>
);

export default TextInput;
