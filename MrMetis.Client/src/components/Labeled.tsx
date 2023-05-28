import React, { FC } from "react";
import { useTranslation } from "react-i18next";

export interface ILabeledProps {
  labelKey: string;
  className?: string;
  labelClassName?: string;
  errorKey?: string;
  horisontal?: boolean;
  required?: boolean;
}

const Labeled: FC<ILabeledProps> = ({
  labelKey,
  children,
  className = "",
  labelClassName = "",
  errorKey,
  horisontal = false,
  required,
}) => {
  const { t } = useTranslation();
  return (
    <div
      className={`labeled ${className} ${horisontal ? "horisontal" : ""} ${
        errorKey && "has-error"
      }`}
    >
      <label className={`${required && "required"} ${labelClassName}`}>
        {t(labelKey)}
      </label>
      {children}
      {errorKey && <span className="error">{t(errorKey)}</span>}
    </div>
  );
};

export default Labeled;
