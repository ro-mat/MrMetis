import React from "react";
import { FieldValues } from "react-hook-form";
import useBudget from "hooks/useBudget";
import { IBudget } from "store/userdata/userdata.types";
import SelectBox, { ISelectBoxProps } from "components/ui/SelectBox";

interface IBudgetSelectProps<T extends FieldValues> extends Omit<
  ISelectBoxProps<T>,
  "options"
> {
  // hides budgets from the list
  exclude?: (budget: IBudget) => boolean;
}

const BudgetSelect = <T extends FieldValues>({
  exclude,
  ...selectProps
}: IBudgetSelectProps<T>) => {
  const { budgets } = useBudget();
  const options = budgets
    .filter((b) => !exclude?.(b))
    .map((b) => ({ value: b.id, label: b.name }));

  return <SelectBox options={options} {...selectProps} />;
};

export default BudgetSelect;
