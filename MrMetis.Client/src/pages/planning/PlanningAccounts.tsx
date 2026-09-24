import AccountsTableBody from "components/Planning/AccountsTableBody";
import TableHeader from "components/Planning/TableHeader";
import React, { useMemo } from "react";
import { IPlanningProps } from "./Index";
import { useOutletContext } from "react-router-dom";
import { BudgetTypeExtra } from "store/userdata/userdata.types";
import TableRowsExtra from "components/Planning/TableRowsExtra";
import useAccount from "hooks/useAccount";

const PlanningAccounts = () => {
  const { months, budgetPairArray } = useOutletContext<IPlanningProps>();

  const { accounts } = useAccount();

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => [1, 2, 3].includes(a.id)),
    [accounts]
  );

  return (
    <>
      <div className="planning-table">
        <table>
          <thead>
            <TableHeader months={months} />
          </thead>
          <tbody>
            {filteredAccounts.map((a, index) => (
              <React.Fragment key={a.id}>
                <AccountsTableBody
                  accountId={a.id}
                  accountName={a.name}
                  budgetPairArray={budgetPairArray}
                  months={months}
                  index={index}
                />
              </React.Fragment>
            ))}
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

export default PlanningAccounts;
