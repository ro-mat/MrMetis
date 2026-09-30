import React, { ReactNode, useEffect, useRef } from "react";
import useToggle from "hooks/useToggle";
import Button from "./Button";
import { cx } from "./cx";

export interface IMenuItem {
  key: string;
  label: ReactNode;
  onClick: () => void;
  // draws a divider above the item
  separated?: boolean;
}

interface IMenuProps {
  trigger: ReactNode;
  triggerLabel?: string; // aria-label, for icon-only triggers
  items: IMenuItem[];
  align?: "left" | "right";
  className?: string;
}

// A button that opens a small list of actions.
const Menu = ({
  trigger,
  triggerLabel,
  items,
  align = "left",
  className,
}: IMenuProps) => {
  const [open, toggle, setOpen] = useToggle();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onMouseDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, setOpen]);

  return (
    <div ref={ref} className={cx("menu", className)}>
      <Button
        variant="plain"
        size="normal"
        className="menu-trigger"
        aria-label={triggerLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        {trigger}
      </Button>
      {open && (
        <div role="menu" className={cx("menu-list", align)}>
          {items.map((item) => (
            <Button
              key={item.key}
              role="menuitem"
              variant="plain"
              size="normal"
              className={cx(item.separated && "separated")}
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
            >
              {item.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default Menu;
