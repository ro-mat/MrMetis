import React from "react";
import { BudgetType, BudgetTypeUser } from "store/userdata/userdata.types";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { Moment } from "moment";

export interface ITableRowTotalProps {
  types: BudgetType[];
  months: Moment[];
  budgetPairArray: BudgetPairArray;
  totalLabel?: string;
  highlight?: boolean;
  accountId?: number;
}

const TableRowTotal = ({
  types,
  months,
  budgetPairArray,
  totalLabel,
  highlight = false,
  accountId,
}: ITableRowTotalProps) => {
  if (!types) {
    throw Error("Types cannot be empty!");
  }

  const { t } = useTranslation();

  return (
    <tr className={highlight ? "highlight" : ""}>
      <td>
        <strong>
          {totalLabel ??
            `${t("planning.total")} ${t(
              `budgetType.${BudgetTypeUser[types[0]]}`
            )}`}
        </strong>
      </td>
      {months.map((month, index) => {
        return (
          <React.Fragment key={index}>
            <TableCellPair
              pair={budgetPairArray.getTotalPair(types, month, accountId)}
              isStrong={true}
              moreIsGood={types.includes(BudgetTypeUser.income)}
            />
          </React.Fragment>
        );
      })}
    </tr>
  );
};

export default TableRowTotal;
