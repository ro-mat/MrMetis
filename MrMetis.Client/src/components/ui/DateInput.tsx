import React from "react";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import { Control, Controller, FieldPath, FieldValues } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import Field, { IFieldProps } from "./Field";

interface IDateInputProps<T extends FieldValues> extends IFieldProps {
  name: FieldPath<T>;
  control: Control<T, unknown, FieldValues>;
  // "month" picks a whole month (used for budgets and balances)
  mode?: "day" | "month";
}

const DateInput = <T extends FieldValues>({
  name,
  control,
  mode = "day",
  ...fieldProps
}: IDateInputProps<T>) => {
  const { i18n } = useTranslation();
  const monthProps =
    mode === "month"
      ? {
          dateFormat: "MM-yyyy",
          showMonthYearPicker: true,
          showTwoColumnMonthYearPicker: true,
        }
      : {};

  return (
    <Field {...fieldProps}>
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <DatePicker
            name={field.name}
            ref={field.ref}
            onBlur={field.onBlur}
            locale={i18n.language}
            selected={field.value ? new Date(field.value) : null}
            onChange={(date: Date | null) => field.onChange(date)}
            {...monthProps}
          />
        )}
      />
    </Field>
  );
};

export default DateInput;
