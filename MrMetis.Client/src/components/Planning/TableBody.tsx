import React from "react";
import { IActiveBudget } from "hooks/useBudget";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import TableRowsFromPrevMonth from "./TableRowsFromPrevMonth";
import { BudgetMonth } from "types/BudgetMonth";

export interface ITableBodyProps {
  budgetMonths: BudgetMonth[];
  activeBudgets: IActiveBudget[];
}

const TableBody = ({ budgetMonths, activeBudgets }: ITableBodyProps) => {
  return (
    <>
      <TableRowsFromPrevMonth budgetItems={budgetMonths} />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        activeBudgets={activeBudgets}
        budgetItems={budgetMonths}
        moreIsGood={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.savings]}
        activeBudgets={activeBudgets}
        budgetItems={budgetMonths}
        moreIsGood={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.loanReturn]}
        activeBudgets={activeBudgets}
        budgetItems={budgetMonths}
        moreIsGood={false}
      />
      <TableRowsByType
        types={[BudgetTypeUser.spending]}
        activeBudgets={activeBudgets}
        budgetItems={budgetMonths}
        moreIsGood={false}
      />
    </>
  );
};

export default TableBody;
