import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Button from "./Button";
import { cx } from "./cx";

export interface IToggleItem {
  value: string;
  label: string; // i18n key, or plain text when `translate` is false
  to?: string; // renders a router link instead of a button
}

interface IToggleGroupProps {
  items: IToggleItem[];
  value: string | undefined;
  onChange?: (value: string) => void;
  // "tabs": primary/secondary buttons, "text": plain text, selected underlined
  variant?: "tabs" | "text";
  translate?: boolean;
  id?: string;
  className?: string;
}

// A row of options where exactly one is selected.
const ToggleGroup = ({
  items,
  value,
  onChange,
  variant = "tabs",
  translate = true,
  id,
  className,
}: IToggleGroupProps) => {
  const { t } = useTranslation();

  return (
    <div id={id} className={className}>
      {items.map((item) => {
        const isSelected = item.value === value;
        const label = translate ? t(item.label) : item.label;
        const itemClass =
          variant === "tabs"
            ? cx("btn small", isSelected ? "primary" : "secondary")
            : cx(isSelected && "selected");

        return item.to ? (
          <Link key={item.value} to={item.to} className={itemClass}>
            {label}
          </Link>
        ) : (
          <Button
            key={item.value}
            variant="plain"
            size="normal"
            className={itemClass}
            onClick={() => onChange?.(item.value)}
          >
            {label}
          </Button>
        );
      })}
    </div>
  );
};

export default ToggleGroup;
