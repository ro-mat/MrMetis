import React from "react";
import { type FieldAttributes, useField, useFormikContext } from "formik";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterMoment } from "@mui/x-date-pickers/AdapterMoment";
import moment from "moment";
import { useTranslation } from "react-i18next";

export const DatePickerField = ({ ...props }: FieldAttributes<any>) => {
  const { i18n } = useTranslation();

  const { setFieldValue } = useFormikContext();
  const [field] = useField(props);
  return (
    <LocalizationProvider
      dateAdapter={AdapterMoment}
      adapterLocale={i18n.language}
    >
      <DatePicker
        views={["month", "year"]}
        minDate={moment().add(-1, "y")}
        maxDate={moment().add(1, "y")}
        value={(field.value && moment(field.value)) || null}
        format="MM-YYYY"
        onChange={(val) => {
          setFieldValue(field.name, val);
        }}
      />
    </LocalizationProvider>
  );
};
