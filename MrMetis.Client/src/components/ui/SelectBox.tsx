import React, { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";
import Combobox from "./Combobox";

export interface ISelectOption {
  value: number | string;
  label: string;
}

export interface ISelectBoxProps<T extends FieldValues>
  extends
    IFieldProps,
    IBindProps<T>,
    Omit<ComponentProps<"select">, "className" | "name"> {
  options: ISelectOption[];
  // i18n key of an extra first option with value 0 (e.g. "general.no")
  emptyOption?: string;
  // lets the user type to filter the options (needs `name` and `control`)
  filterable?: boolean;
}

// Native <select>, or a filterable combobox. The form gets the option's
// value with its original type (numbers stay numbers).
const SelectBox = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  className,
  options,
  emptyOption,
  filterable,
  ...selectProps
}: ISelectBoxProps<T>) => {
  const { t } = useTranslation();

  const allOptions = emptyOption
    ? [{ value: 0, label: t(emptyOption) }, ...options]
    : options;

  const optionValue = (str: string) =>
    allOptions.find((o) => String(o.value) === str)?.value;

  return (
    <Bound name={name} control={control}>
      {(field, fieldError) => (
        <Field
          {...{ label, required, horizontal, className }}
          error={error ?? fieldError}
        >
          {filterable && field ? (
            <Combobox
              options={allOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              disabled={selectProps.disabled}
              required={required}
            />
          ) : (
            <select
              name={name}
              aria-required={required}
              {...selectProps}
              {...(field && {
                ref: field.ref,
                onBlur: field.onBlur,
                value: field.value ?? "",
                onChange: (e) =>
                  field.onChange(optionValue(e.currentTarget.value)),
              })}
            >
              {allOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </Field>
      )}
    </Bound>
  );
};

export default SelectBox;
