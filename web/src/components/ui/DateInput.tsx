import React from "react";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import { FieldValues } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";
import useLocale from "hooks/useLocale";

interface IDateInputProps<T extends FieldValues>
  extends IFieldProps, Required<IBindProps<T>> {
  // "month" picks a whole month (used for budgets and balances)
  mode?: "day" | "month";
  // names the input when there's no label
  ariaLabel?: string;
  // shown while no date is picked
  placeholder?: string;
}

const DateInput = <T extends FieldValues>({
  name,
  control,
  mode = "day",
  error,
  ariaLabel,
  placeholder,
  ...fieldProps
}: IDateInputProps<T>) => {
  const { i18n } = useTranslation();
  const { locale } = useLocale();
  const modeProps =
    mode === "month"
      ? {
          dateFormat: locale.pickerMonth,
          showMonthYearPicker: true,
          showTwoColumnMonthYearPicker: true,
        }
      : { dateFormat: locale.pickerDate };

  return (
    <Bound name={name} control={control}>
      {(field, fieldError) => (
        <Field {...fieldProps} error={error ?? fieldError}>
          <DatePicker
            name={field?.name}
            ariaLabel={ariaLabel}
            placeholderText={placeholder}
            ref={field?.ref}
            onBlur={field?.onBlur}
            locale={i18n.resolvedLanguage ?? i18n.language}
            calendarStartDay={locale.firstDayOfWeek}
            selected={field?.value ? new Date(field.value) : null}
            onChange={(date: Date | null) => field?.onChange(date)}
            {...modeProps}
          />
        </Field>
      )}
    </Bound>
  );
};

export default DateInput;
