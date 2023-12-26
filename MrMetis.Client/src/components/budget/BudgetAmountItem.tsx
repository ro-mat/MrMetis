import { DatePickerField } from "components/DatePickerField";
import Labeled from "components/Labeled";
import { Select, MenuItem } from "@mui/material";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTrashCan } from "@fortawesome/free-regular-svg-icons";
import { ChangeEvent, FC } from "react";
import { AmountType, IAmount } from "types/IAmount";
import { getEnumArray } from "helpers/enumHelper";
import { IAccount } from "store/userdata/userdata.types";

export interface IBudgetAmountItemProps {
  index: number;
  item: IAmount;
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

const BudgetAmountItem: FC<IBudgetAmountItemProps> = ({
  index,
  item,
  budgetAccountId,
  accounts,
  handleChange,
  handleBlur,
  handleRemoveItem,
}) => {
  return (
    <div key={index}>
      <Labeled labelKey="budget.startDate" required>
        <DatePickerField name={`amounts[${index}].startDate`} />
      </Labeled>
      <Labeled labelKey="budget.endDate">
        <DatePickerField name={`amounts[${index}].endDate`} />
      </Labeled>
      <Labeled labelKey="budget.fromAccount" required>
        <Select
          name={`amounts[${index}].fromAccountId`}
          value={
            budgetAccountId
              ? budgetAccountId
              : item.fromAccountId
              ? item.fromAccountId
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
      <Labeled labelKey="budget.amountType" required>
        <Select
          name={`amounts[${index}].amountType`}
          value={item.amountType ?? AmountType.Basic}
          onChange={handleChange}
          onBlur={handleBlur}
        >
          {getEnumArray(AmountType).map((id) => (
            <MenuItem key={id} value={id}>
              {AmountType[id]}
            </MenuItem>
          ))}
        </Select>
      </Labeled>
      <Labeled labelKey="budget.amount">
        <input
          type="text"
          name={`amounts[${index}].amount`}
          value={item.amount}
          onChange={handleChange}
        />
      </Labeled>
      <Labeled labelKey="budget.frequency" required>
        <input
          type="number"
          name={`amounts[${index}].frequency`}
          value={item.frequency}
          onChange={handleChange}
          onBlur={handleBlur}
        />
      </Labeled>
      <div>
        <button
          type="button"
          className="button"
          onClick={() => handleRemoveItem(index)}
        >
          <FontAwesomeIcon icon={faTrashCan} />
        </button>
      </div>
    </div>
  );
};
export default BudgetAmountItem;
