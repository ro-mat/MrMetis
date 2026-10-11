import React from "react";
import { FieldValues } from "react-hook-form";
import useAccount from "hooks/useAccount";
import { IAccount } from "store/userdata/userdata.types";
import SelectBox, { ISelectBoxProps } from "components/ui/SelectBox";

interface IAccountSelectProps<T extends FieldValues> extends Omit<
  ISelectBoxProps<T>,
  "options"
> {
  // hides accounts from the list
  exclude?: (account: IAccount) => boolean;
}

const AccountSelect = <T extends FieldValues>({
  exclude,
  ...selectProps
}: IAccountSelectProps<T>) => {
  const { accounts } = useAccount();
  const options = accounts
    .filter((a) => !exclude?.(a))
    .map((a) => ({ value: a.id, label: a.name }));

  return <SelectBox options={options} {...selectProps} />;
};

export default AccountSelect;
