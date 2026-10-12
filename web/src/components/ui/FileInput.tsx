import React, { ComponentProps } from "react";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";

type IFileInputProps<T extends FieldValues> = IFieldProps &
  IBindProps<T> &
  Omit<ComponentProps<"input">, "className" | "name" | "type" | "value">;

// File picker; the form gets the picked File (undefined when none). Resetting
// the field clears the picker too.
const FileInput = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  wrapLabel,
  className,
  ...inputProps
}: IFileInputProps<T>) => (
  <Bound name={name} control={control}>
    {(field, fieldError) => (
      <Field
        {...{ label, required, horizontal, wrapLabel, className }}
        error={error ?? fieldError}
      >
        <input
          type="file"
          name={name}
          aria-required={required}
          {...inputProps}
          {...(field && {
            // runs on every render: the browser keeps the picked file's name
            ref: (el: HTMLInputElement | null) => {
              field.ref(el);
              if (el && field.value === undefined) el.value = "";
            },
            onBlur: field.onBlur,
            onChange: (e) => field.onChange(e.currentTarget.files?.[0]),
          })}
        />
      </Field>
    )}
  </Bound>
);

export default FileInput;
