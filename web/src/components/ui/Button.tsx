import React, { ComponentProps, ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cx } from "./cx";

export interface IButtonProps extends ComponentProps<"button"> {
  variant?: "primary" | "secondary" | "plain";
  size?: "small" | "normal" | "big";
  // shown on hover while the button is disabled
  disabledReason?: ReactNode;
}

// Defaults to type="button", so it never submits a form by accident.
const Button = ({
  variant = "secondary",
  size = "small",
  type = "button",
  className,
  disabledReason,
  ...buttonProps
}: IButtonProps) => {
  const button = (
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

  if (!disabledReason) {
    return button;
  }

  // disabled buttons don't get mouse events, so the wrapper shows the reason;
  // it stays while enabled so the button isn't remounted when that toggles
  return (
    <span className="disabled-reason">
      {button}
      {buttonProps.disabled && <span role="tooltip">{disabledReason}</span>}
    </span>
  );
};

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
