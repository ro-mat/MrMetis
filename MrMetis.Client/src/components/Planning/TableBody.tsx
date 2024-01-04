import React from "react";
import { BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import TableRowsFromPrevMonth from "./TableRowsFromPrevMonth";
import { BudgetPairArray } from "services/budgetBuilder";

export interface ITableBodyProps {
  budgetPairArray: BudgetPairArray;
}

const TableBody = ({ budgetPairArray }: ITableBodyProps) => {
  return (
    <>
      <TableRowsFromPrevMonth budgetPairArray={budgetPairArray} />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.savings]}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.loanReturn]}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.spending]}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
    </>
  );
};

export default TableBody;
