import React from "react";
import DatePicker from "react-datepicker";
import { useTranslation } from "react-i18next";
import { Controller } from "react-hook-form";
import "react-datepicker/dist/react-datepicker.css";

interface IDatePickerFieldProps {
  name: string;
  control?: any;
}

export const DatePickerField = ({ name, control }: IDatePickerFieldProps) => {
  const { i18n } = useTranslation();

  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <DatePicker
          {...field}
          locale={i18n.language}
          dateFormat="MM-yyyy"
          selected={field.value ? new Date(field.value) : null}
          onChange={(date) => field.onChange(date)}
          showMonthYearPicker
          showTwoColumnMonthYearPicker
        />
      )}
    />
  );
};
