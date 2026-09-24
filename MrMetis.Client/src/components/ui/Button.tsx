import React, { ComponentProps } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

export interface IButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "plain";
  size?: "small" | "normal" | "big";
}

// Defaults to type="button", so it never submits a form by accident.
const Button = ({
  variant = "secondary",
  size = "small",
  type = "button",
  className,
  ...buttonProps
}: IButtonProps) => (
  <button
    type={type}
    className={cx(
      variant !== "plain" && "btn",
      variant !== "plain" && variant,
      size !== "normal" && size,
      className
    )}
    {...buttonProps}
  />
);

interface ICtaButtonProps extends IButtonProps {
  // shows `loadingLabel` (i18n key) and disables the button
  loading?: boolean;
  loadingLabel?: string;
}

// Main action of a form or page. Submits by default.
export const CtaButton = ({
  type = "submit",
  loading,
  loadingLabel,
  disabled,
  children,
  ...buttonProps
}: ICtaButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button
      variant="primary"
      type={type}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading && loadingLabel ? t(loadingLabel) : children}
    </Button>
  );
};

export const CancelButton = ({ children, ...buttonProps }: IButtonProps) => {
  const { t } = useTranslation();
  return (
    <Button variant="secondary" {...buttonProps}>
      {children ?? t("addOrEdit.cancel")}
    </Button>
  );
};

export default Button;
