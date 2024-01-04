import AccountsTableBody from "components/Planning/AccountsTableBody";
import TableHeader from "components/Planning/TableHeader";
import TableRowMonthDelta from "components/Planning/TableRowMonthDelta";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import React, { useMemo } from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

const PlanningAccounts = () => {
  const { accounts } = useSelector((state: AppState) => state.data.userdata);
  const { filter } = useSelector((state: AppState) => state.ui.ui);

  const { budgetPairArray, isReady } = useBudgetCalculate(
    filter.fromRelativeMonth,
    filter.toRelativeMonth
  );
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  const filteredAccounts = useMemo(
    () => accounts.filter((a) => [1, 2, 3].includes(a.id)),
    [accounts]
  );

  return (
    <>
      {isReady ? (
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
                    index={index}
                  />
                </React.Fragment>
              ))}
              <TableRowMonthDelta budgetPairArray={budgetPairArray} />
            </tbody>
          </table>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </>
  );
};

export default PlanningAccounts;
