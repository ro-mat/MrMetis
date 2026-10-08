import React, { ComponentProps, useState } from "react";
import { FieldValues } from "react-hook-form";
import Field, { IFieldProps } from "./Field";
import Bound, { IBindProps } from "./Bound";
import useLocale from "hooks/useLocale";

type IAmountInputProps<T extends FieldValues> = IFieldProps &
  Required<IBindProps<T>> &
  Omit<ComponentProps<"input">, "className" | "name" | "type">;

interface IAmountTextProps extends Omit<
  ComponentProps<"input">,
  "className" | "type" | "value" | "onChange"
> {
  value: unknown;
  onChange: (value: number | undefined) => void;
  required?: boolean;
}

// Keeps what the user typed (e.g. "12," on the way to "12,5") while the
// form holds the parsed number.
const AmountText = ({
  value,
  onChange,
  required,
  ...inputProps
}: IAmountTextProps) => {
  const { parseAmount, formatNumber } = useLocale();
  const toText = (value: unknown) =>
    typeof value === "number" && !isNaN(value) ? formatNumber(value) : "";
  const [text, setText] = useState(() => toText(value));

  // the form value changed from outside (e.g. reset): show it
  const parsed = parseAmount(text);
  const sameValue =
    parsed === value || (Number.isNaN(parsed) && Number.isNaN(value));
  const shown = sameValue ? text : toText(value);
  if (!sameValue && shown !== text) {
    setText(shown);
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      aria-required={required}
      {...inputProps}
      value={shown}
      onChange={(e) => {
        setText(e.currentTarget.value);
        onChange(parseAmount(e.currentTarget.value));
      }}
    />
  );
};

// Number input in the user's format (decimal and thousands separators);
// the form gets a number, undefined while empty or NaN for other text.
const AmountInput = <T extends FieldValues>({
  name,
  control,
  label,
  required,
  error,
  horizontal,
  wrapLabel,
  className,
  ...inputProps
}: IAmountInputProps<T>) => (
  <Bound name={name} control={control}>
    {(field, fieldError) => (
      <Field
        {...{ label, required, horizontal, wrapLabel, className }}
        error={error ?? fieldError}
      >
        <AmountText
          {...inputProps}
          required={required}
          name={field!.name}
          ref={field!.ref}
          onBlur={field!.onBlur}
          value={field!.value}
          onChange={field!.onChange}
        />
      </Field>
    )}
  </Bound>
);

export default AmountInput;
