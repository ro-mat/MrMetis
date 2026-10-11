import React, { KeyboardEvent, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import useListSelection from "hooks/useListSelection";
import Dropdown from "./Dropdown";
import { cx } from "./cx";
import { ISelectOption } from "./SelectBox";

interface IComboboxProps {
  options: ISelectOption[];
  value: ISelectOption["value"] | undefined;
  onChange: (value: ISelectOption["value"]) => void;
  onBlur?: () => void;
  name?: string;
  disabled?: boolean;
  required?: boolean;
}

// Select with a text field: typing narrows the options shown in a dropdown.
// While not focused it shows the label of the selected option.
const Combobox = ({
  options,
  value,
  onChange,
  onBlur,
  name,
  disabled,
  required,
}: IComboboxProps) => {
  const { t } = useTranslation();
  // null while closed, otherwise what the user has typed
  const [searchText, setSearchText] = useState<string | null>(null);
  const isOpen = searchText !== null;

  const items = useMemo(() => {
    const search = (searchText ?? "").toLocaleLowerCase();
    return options
      .filter((o) => o.label.toLocaleLowerCase().includes(search))
      .map((o) => ({ id: String(o.value), text: o.label }));
  }, [options, searchText]);

  const { selectedId, setSelectedId, move } = useListSelection(
    items,
    String(value)
  );

  const open = () => {
    if (!isOpen) {
      setSearchText("");
    }
  };

  // closing forgets the highlighted item, so reopening starts at the value
  const close = () => {
    setSearchText(null);
    setSelectedId("");
  };

  const pick = (id: string) => {
    const option = options.find((o) => String(o.value) === id);
    if (option) {
      onChange(option.value);
    }
    close();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
      case "ArrowUp":
        if (isOpen) {
          move(event.key === "ArrowDown" ? 1 : -1);
        } else {
          open();
        }
        break;
      case "Enter":
        // pick instead of submitting the form
        if (!isOpen) return;
        pick(selectedId);
        break;
      case "Escape":
        close();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  return (
    <div className={cx("combobox", isOpen && "open")}>
      <input
        type="text"
        role="combobox"
        aria-expanded={isOpen}
        aria-required={required}
        name={name}
        disabled={disabled}
        placeholder={isOpen ? selectedLabel : undefined}
        value={isOpen ? searchText : selectedLabel}
        // open on focus and on click, so it reopens while still focused
        // (e.g. right after picking an option)
        onFocus={open}
        onClick={open}
        onChange={(e) => setSearchText(e.currentTarget.value)}
        onBlur={() => {
          close();
          onBlur?.();
        }}
        onKeyDown={handleKeyDown}
      />
      {/* same arrow as a native select, so it doesn't look like free text */}
      <span className="combobox-arrow" aria-hidden="true" />
      {isOpen && (
        <Dropdown
          items={items}
          selectedId={selectedId}
          onHover={setSelectedId}
          onPick={pick}
          emptyText={t("general.nothingFound")}
        />
      )}
    </div>
  );
};

export default Combobox;
