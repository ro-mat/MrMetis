import React, { useMemo } from "react";
import TableBody from "components/Planning/TableBody";
import TableHeader from "components/Planning/TableHeader";
import TableRowMonthDelta from "components/Planning/TableRowMonthDelta";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

const PlanningAll = () => {
  const { filter } = useSelector((state: AppState) => state.ui.ui);

  const { budgetPairArray } = useBudgetCalculate(
    filter.fromRelativeMonth,
    filter.toRelativeMonth
  );
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    <>
      <div>
        <table className="planning-table">
          <thead>
            <TableHeader months={months} />
          </thead>
          <tbody>
            <TableBody budgetPairArray={budgetPairArray} />
            <TableRowMonthDelta budgetPairArray={budgetPairArray} />
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PlanningAll;
