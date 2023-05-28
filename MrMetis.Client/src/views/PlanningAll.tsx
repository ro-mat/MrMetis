import React from "react";
import TableBody from "components/Planning/TableBody";
import TableHeader from "components/Planning/TableHeader";
import TableRowMonthDelta from "components/Planning/TableRowMonthDelta";
import useBudget from "hooks/useBudget";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

const PlanningAll = () => {
  const { filter } = useSelector((state: AppState) => state.ui.ui);

  const { budgetMonths, activeBudgets } = useBudget(
    filter.fromRelativeMonth,
    filter.toRelativeMonth
  );

  return (
    <>
      <div>
        <table className="planning-table">
          <thead>
            <TableHeader budgetMonths={budgetMonths} />
          </thead>
          <tbody>
            <TableBody
              budgetMonths={budgetMonths}
              activeBudgets={activeBudgets}
            />
            <TableRowMonthDelta budgetMonths={budgetMonths} />
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PlanningAll;
