import React, { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

// Props every form control accepts. `label` and `error` are i18n keys.
export interface IFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  horizontal?: boolean;
  className?: string;
}

// Wraps a control with its (optional) label and validation error.
const Field = ({
  label,
  required,
  error,
  horizontal,
  className,
  children,
}: IFieldProps & { children: ReactNode }) => {
  const { t } = useTranslation();

  return (
    <div
      className={cx(
        "labeled",
        horizontal && "horizontal",
        error && "has-error",
        className
      )}
    >
      {label && (
        <label className={cx(required && "required")}>{t(label)}</label>
      )}
      {children}
      {error && <span className="error">{t(error)}</span>}
    </div>
  );
};

export default Field;
