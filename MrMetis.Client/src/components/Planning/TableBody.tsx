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
        type={BudgetTypeUser.income}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        type={BudgetTypeUser.savings}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={true}
        showTotal={true}
      />
      <TableRowsByType
        type={BudgetTypeUser.loanReturn}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
      <TableRowsByType
        type={BudgetTypeUser.spending}
        months={months}
        budgetPairArray={budgetPairArray}
        moreIsGood={false}
        showTotal={true}
      />
    </>
  );
};

export default TableBody;
