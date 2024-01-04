import React, { FC, useMemo } from "react";
import { BudgetType, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import TableCellPair from "./TableCellPair";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { Moment } from "moment";
import useBudget from "hooks/useBudget";

export interface ITableRowsByTypeProps {
  types: BudgetType[];
  months: Moment[];
  budgetPairArray: BudgetPairArray;
  moreIsGood: boolean;
  totalLabel?: string;
  showTotal?: boolean;
  highlight?: boolean;
  accountId?: number;
}

const TableRowsByType: FC<ITableRowsByTypeProps> = ({
  types,
  months,
  budgetPairArray,
  moreIsGood,
  totalLabel,
  showTotal = false,
  highlight = false,
  accountId,
}) => {
  const { t } = useTranslation();
  const { budgets } = useBudget();

  const filteredBudgets = useMemo(
    () =>
      budgets.filter(
        (b) =>
          types.includes(b.type) &&
          !b.parentId &&
          budgetPairArray.isBudgetActive(b.id, accountId)
      ),
    [budgets, types, budgetPairArray, accountId]
  );

  return (
    <>
      {filteredBudgets.map((b) => (
        <TableRow
          key={b.id}
          budget={b}
          months={months}
          budgetPairArray={budgetPairArray}
          moreIsGood={moreIsGood}
          highlight={highlight}
          accountId={accountId}
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
