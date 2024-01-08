import React, { useMemo } from "react";
import {
  BudgetType,
  BudgetTypeExtra,
  BudgetTypeUser,
  IBudget,
} from "store/userdata/userdata.types";
import TableRow from "./TableRow";
import { useTranslation } from "react-i18next";
import { BudgetPairArray } from "services/budgetBuilder";
import { Moment } from "moment";
import useBudget from "hooks/useBudget";
import TableRowTotal from "./TableRowTotal";

export interface ITableRowsByTypeProps {
  type: BudgetType;
  months: Moment[];
  budgetPairArray: BudgetPairArray;
  moreIsGood: boolean;
  totalLabel?: string;
  showTotal?: boolean;
  highlight?: boolean;
  accountId?: number;
}

const TableRowsByType = ({
  type,
  months,
  budgetPairArray,
  moreIsGood,
  totalLabel,
  showTotal = false,
  highlight = false,
  accountId,
}: ITableRowsByTypeProps) => {
  const { t } = useTranslation();
  const { budgets } = useBudget();

  const filteredBudgets = useMemo(
    () =>
      budgets.filter((b) => filterFactory(type)(b, budgetPairArray, accountId)),
    [budgets, type, budgetPairArray, accountId]
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
        <TableRowTotal
          types={[type]}
          months={months}
          budgetPairArray={budgetPairArray}
          highlight={highlight}
          totalLabel={totalLabel}
          accountId={accountId}
        />
      )}
    </>
  );
};

const filterFactory = (budgetType: BudgetType) => {
  switch (budgetType) {
    case BudgetTypeExtra.transferFromAccount:
      return (
        b: IBudget,
        budgetPairArray: BudgetPairArray,
        accountId?: number
      ) =>
        b.type === BudgetTypeUser.transferToAccount &&
        b.toAccountId === accountId &&
        budgetPairArray.isBudgetActive(b.id, accountId);

    default:
      return (
        b: IBudget,
        budgetPairArray: BudgetPairArray,
        accountId?: number
      ) =>
        b.type === budgetType &&
        !b.parentId &&
        (accountId === undefined ||
          b.fromAccountId === 0 ||
          b.fromAccountId === accountId) &&
        budgetPairArray.isBudgetActive(b.id, accountId);
  }
};

export default TableRowsByType;
