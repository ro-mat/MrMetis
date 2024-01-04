import React from "react";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRowsByType from "./TableRowsByType";
import { BudgetPairArray } from "services/budgetBuilder";
import TableRowsExtra from "./TableRowsExtra";
import { Moment } from "moment";

export interface ITableBodyProps {
  budgetPairArray: BudgetPairArray;
  months: Moment[];
}

const TableBody = ({ budgetPairArray, months }: ITableBodyProps) => {
  return (
    <>
      <TableRowsExtra
        type={BudgetTypeExtra.leftFromPrevMonth}
        budgetPairArray={budgetPairArray}
        months={months}
        isStrong={false}
      />
      <TableRowsByType
        types={[BudgetTypeUser.income]}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.savings]}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.loanReturn]}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
      <TableRowsByType
        types={[BudgetTypeUser.spending]}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
    </>
  );
};

export default TableBody;
