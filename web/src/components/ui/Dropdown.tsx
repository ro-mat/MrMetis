import React from "react";

export interface IDropdownItem {
  id: string;
  text: string;
}

interface IDropdownProps {
  items: IDropdownItem[];
  selectedId: string;
  onHover: (id: string) => void;
  onPick: (id: string) => void;
  // shown when there are no items
  emptyText?: string;
}

// List of choices shown under a text field (QuickAdd, filterable SelectBox).
const Dropdown = ({
  items,
  selectedId,
  onHover,
  onPick,
  emptyText,
}: IDropdownProps) => (
  <div className="dropdown-wrapper">
    {items.map((item) => (
      <div
        key={item.id}
        className={item.id === selectedId ? "selected" : ""}
        onMouseOver={() => onHover(item.id)}
        // mousedown fires before the text field's blur, so the pick is not lost
        onMouseDown={(e) => {
          e.preventDefault();
          onPick(item.id);
        }}
      >
        {item.text}
      </div>
    ))}
    {items.length === 0 && emptyText && <div>{emptyText}</div>}
  </div>
);

export default Dropdown;
