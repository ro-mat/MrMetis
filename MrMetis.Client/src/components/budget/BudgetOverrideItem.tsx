import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import Labeled from "components/Labeled";
import { Select, MenuItem } from "@mui/material";
import { DatePickerField } from "components/DatePickerField";
import { ChangeEvent, FC } from "react";
import { IAccount } from "store/userdata/userdata.types";
import { IMonthAmountPair } from "types/IMonthAmountPair";

export interface IBudgetOverrideItemProps {
  index: number;
  item: IMonthAmountPair;
  budgetAccountId?: number;
  accounts: IAccount[];
  handleChange: {
    (e: React.ChangeEvent<any>): void;
    <T = string | React.ChangeEvent<any>>(
      field: T
    ): T extends React.ChangeEvent<any>
      ? void
      : (e: string | React.ChangeEvent<any>) => void;
  };
  handleBlur: (e: ChangeEvent<any>) => void;
  handleRemoveItem: (id: number) => void;
}

const BudgetOverrideItem: FC<IBudgetOverrideItemProps> = ({
  index,
  item,
  budgetAccountId,
  accounts,
  handleChange,
  handleBlur,
  handleRemoveItem,
}) => {
  return (
    <div>
      <Labeled labelKey="budget.month" required>
        <DatePickerField name={`overrides[${index}].month`} />
      </Labeled>
      <Labeled labelKey="budget.fromAccount" required>
        <Select
          name={`overrides[${index}].accountId`}
          value={
            budgetAccountId
              ? budgetAccountId
              : item.accountId
              ? item.accountId
              : 1
          }
          onChange={handleChange}
          onBlur={handleBlur}
          disabled={!!budgetAccountId}
        >
          {accounts.map((a) => (
            <MenuItem key={a.id} value={a.id}>
              {a.name}
            </MenuItem>
          ))}
        </Select>
      </Labeled>
      <Labeled labelKey="budget.amount">
        <input
          type="number"
          name={`overrides[${index}].amount`}
          value={item.amount}
          onChange={handleChange}
        />
      </Labeled>

      <div>
        <button type="button" onClick={() => handleRemoveItem(index)}>
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
};

export default BudgetOverrideItem;
