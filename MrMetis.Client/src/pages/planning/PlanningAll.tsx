import React from "react";
import TableBody from "components/Planning/TableBody";
import TableHeader from "components/Planning/TableHeader";
import { IPlanningProps } from "./Index";
import { useOutletContext } from "react-router-dom";
import TableRowsExtra from "components/Planning/TableRowsExtra";
import { BudgetTypeExtra } from "store/userdata/userdata.types";

const PlanningAll = () => {
  const { months, budgetPairArray } = useOutletContext<IPlanningProps>();

  return (
    <>
      <div>
        <table className="planning-table">
          <thead>
            <TableHeader months={months} />
          </thead>
          <tbody>
            <TableBody budgetPairArray={budgetPairArray} months={months} />
            <tr>
              <td colSpan={months.length * 2 + 1}>&nbsp;</td>
            </tr>
            <TableRowsExtra
              type={BudgetTypeExtra.monthDelta}
              budgetPairArray={budgetPairArray}
              months={months}
            />
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PlanningAll;
