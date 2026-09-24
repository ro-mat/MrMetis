import React, { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Combobox from "./Combobox";

export interface ISelectOption {
  value: number | string;
  label: string;
}

export interface ISelectBoxProps<T extends FieldValues>
  extends IFieldProps, Omit<ComponentProps<"select">, "className"> {
  options: ISelectOption[];
  // i18n key of an extra first option with value 0 (e.g. "general.no")
  emptyOption?: string;
  // lets the user type to filter the options; needs `name` and `control`
  filterable?: boolean;
  control?: Control<T, unknown, FieldValues>;
}

// Native <select> (spread `register("name")` into it), or a filterable
// combobox bound to the form through `control`.
const SelectBox = <T extends FieldValues>({
  label,
  required,
  error,
  horizontal,
  className,
  options,
  emptyOption,
  filterable,
  control,
  ...selectProps
}: ISelectBoxProps<T>) => {
  const { t } = useTranslation();

  const allOptions = emptyOption
    ? [{ value: 0, label: t(emptyOption) }, ...options]
    : options;

  return (
    <Field {...{ label, required, error, horizontal, className }}>
      {filterable && control ? (
        <Controller
          control={control}
          name={selectProps.name as FieldPath<T>}
          render={({ field }) => (
            <Combobox
              options={allOptions}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              name={field.name}
              disabled={selectProps.disabled}
              required={required}
            />
          )}
        />
      ) : (
        <select aria-required={required} {...selectProps}>
          {allOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
};

export default SelectBox;
