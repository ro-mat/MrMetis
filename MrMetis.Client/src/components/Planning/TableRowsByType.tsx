import React, { FC, useMemo } from "react";
import { BudgetType, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

export interface ITableRowsByTypeProps {
  types: BudgetType[];
  budgetPairArray: BudgetPairArray;
  moreIsGood: boolean;
  totalLabel?: string;
  showTotal?: boolean;
  highlight?: boolean;
  accountId?: number;
}

const TableRowsByType: FC<ITableRowsByTypeProps> = ({
  types,
  budgetPairArray,
  moreIsGood,
  totalLabel,
  showTotal = true,
  highlight = false,
  accountId,
}) => {
  const { t } = useTranslation();

  const { budgets } = useSelector((state: AppState) => state.data.userdata);

  const filteredBudgets = budgets.filter(
    (b) => types.includes(b.type) && !b.parentId
  );
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    <>
      {filteredBudgets.map((b) => (
        <TableRow
          key={b.id}
          budget={b}
          budgetPairArray={budgetPairArray}
          moreIsGood={moreIsGood}
          highlight={highlight}
        />
      ))}
      {showTotal && (
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
            const hasIncome = types.includes(BudgetTypeUser.income);
            return (
              <React.Fragment key={index}>
                <TableCellPair
                  pair={budgetPairArray.getTotalPair(types, month, accountId)}
                  isStrong={true}
                  moreIsGood={hasIncome}
                />
              </React.Fragment>
            );
          })}
        </tr>
      )}
    </>
  );
};

export default TableRowsByType;
