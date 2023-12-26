import AccountsTableBody from "components/Planning/AccountsTableBody";
import TableHeader from "components/Planning/TableHeader";
import TableRowMonthDelta from "components/Planning/TableRowMonthDelta";
import useBudget from "hooks/useBudget";
import React from "react";
import { useSelector } from "react-redux";
import { AppState } from "store/store";

const PlanningAccounts = () => {
  const { accounts } = useSelector((state: AppState) => state.data.userdata);
  const { filter } = useSelector((state: AppState) => state.ui.ui);

  const { budgetMonths, activeBudgets } = useBudget(
    filter.fromRelativeMonth,
    filter.toRelativeMonth
  );

  const filteredAccounts = accounts.filter((a) => [1, 2, 3].includes(a.id));

  return (
    <>
      <div className="planning-table">
        <table>
          <thead>
            <TableHeader budgetMonths={budgetMonths} />
          </thead>
          <tbody>
            {filteredAccounts.map((a, index) => (
              <React.Fragment key={a.id}>
                <AccountsTableBody
                  accountId={a.id}
                  accountName={a.name}
                  budgetMonths={budgetMonths}
                  activeBudgets={activeBudgets}
                  index={index}
                />
              </React.Fragment>
            ))}
            <TableRowMonthDelta budgetMonths={budgetMonths} />
          </tbody>
        </table>
      </div>
    </>
  );
};

export default PlanningAccounts;
