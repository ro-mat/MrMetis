import React from "react";
import TextInput from "./TextInput";

interface IFilterInputProps {
  label: string; // i18n key
  value: string;
  onChange: (value: string) => void;
}

// Text box above a table that narrows its rows.
const FilterInput = ({ label, value, onChange }: IFilterInputProps) => (
  <div className="filter-text">
    <TextInput
      label={label}
      horizontal
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  </div>
);

export default FilterInput;
