import React from "react";
import { useTranslation } from "react-i18next";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";
import { ISelectOption } from "./SelectBox";

type IRadioGroupProps<T extends FieldValues> = IFieldProps &
  IBindProps<T> & {
    // labels are i18n keys
    options: ISelectOption[];
  };

// Radio buttons in a row, one option selected. The form gets the option's
// value with its original type.
const RadioGroup = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  wrapLabel,
  className,
  options,
}: IRadioGroupProps<T>) => {
  const { t } = useTranslation();

  return (
    <Bound name={name} control={control}>
      {(field, fieldError) => (
        <Field
          {...{ label, required, horizontal, wrapLabel, className }}
          error={error ?? fieldError}
        >
          <div
            className="radio-group"
            role="radiogroup"
            aria-label={label && t(label)}
          >
            {options.map((o) => (
              <label key={o.value}>
                <input
                  type="radio"
                  name={name}
                  value={o.value}
                  {...(field && {
                    onBlur: field.onBlur,
                    checked: field.value === o.value,
                    onChange: () => field.onChange(o.value),
                  })}
                />
                {t(o.label)}
              </label>
            ))}
          </div>
        </Field>
      )}
    </Bound>
  );
};

export default RadioGroup;
