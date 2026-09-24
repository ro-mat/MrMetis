import React from "react";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import { FieldValues } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";

interface IDateInputProps<T extends FieldValues>
  extends IFieldProps, Required<IBindProps<T>> {
  // "month" picks a whole month (used for budgets and balances)
  mode?: "day" | "month";
}

const DateInput = <T extends FieldValues>({
  name,
  control,
  mode = "day",
  error,
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
    <Bound name={name} control={control}>
      {(field, fieldError) => (
        <Field {...fieldProps} error={error ?? fieldError}>
          <DatePicker
            name={field?.name}
            ref={field?.ref}
            onBlur={field?.onBlur}
            locale={i18n.language}
            selected={field?.value ? new Date(field.value) : null}
            onChange={(date: Date | null) => field?.onChange(date)}
            {...monthProps}
          />
        </Field>
      )}
    </Bound>
  );
};

export default DateInput;
