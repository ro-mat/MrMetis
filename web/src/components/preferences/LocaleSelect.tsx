import React from "react";
import { useTranslation } from "react-i18next";
import { Control, Controller } from "react-hook-form";
import { z } from "zod";
import { ISelectOption, SelectBox } from "components/ui";
import {
  COUNTRY_DEFAULT,
  FormFields,
  OverrideField,
  schema,
} from "./preferencesForm";

interface ILocaleSelectProps {
  name: OverrideField;
  control: Control<FormFields, unknown, z.output<typeof schema>>;
  label: string;
  options: ISelectOption[];
  // the country's value
  preset: string | number;
}

// The country's value is marked as the default; picking it follows the
// country again (also after changing the country).
const LocaleSelect = ({
  name,
  control,
  label,
  options,
  preset,
}: ILocaleSelectProps) => {
  const { t } = useTranslation();
  const marked = options.map((o) =>
    o.value === preset
      ? { ...o, label: `${o.label} — ${t("preferences.default")}` }
      : o
  );

  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <SelectBox
          label={label}
          options={marked}
          name={field.name}
          onBlur={field.onBlur}
          value={String(field.value === COUNTRY_DEFAULT ? preset : field.value)}
          onChange={(e) => {
            const picked = options.find(
              (o) => String(o.value) === e.currentTarget.value
            )?.value;
            field.onChange(picked === preset ? COUNTRY_DEFAULT : picked);
          }}
        />
      )}
    />
  );
};

export default LocaleSelect;
