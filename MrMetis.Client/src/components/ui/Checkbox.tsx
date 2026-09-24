import React, { ComponentProps } from "react";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";

type ICheckboxProps<T extends FieldValues> = IFieldProps &
  IBindProps<T> &
  Omit<ComponentProps<"input">, "className" | "type" | "name">;

// Label is shown next to the box unless `horizontal={false}`.
const Checkbox = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal = true,
  className,
  ...inputProps
}: ICheckboxProps<T>) => (
  <Bound name={name} control={control}>
    {(field, fieldError) => (
      <Field
        {...{ label, required, horizontal, className }}
        error={error ?? fieldError}
      >
        <input
          type="checkbox"
          name={name}
          aria-required={required}
          {...inputProps}
          {...(field && {
            ref: field.ref,
            onBlur: field.onBlur,
            checked: !!field.value,
            onChange: (e) => field.onChange(e.currentTarget.checked),
          })}
        />
      </Field>
    )}
  </Bound>
);

export default Checkbox;
