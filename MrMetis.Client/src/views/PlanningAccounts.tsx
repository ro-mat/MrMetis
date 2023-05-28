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
            {filteredAccounts.map((a) => (
              <React.Fragment key={a.id}>
                <tr>
                  <td colSpan={budgetMonths.length * 2 + 1}>
                    <strong>{a.name}</strong>
                  </td>
                </tr>
                <AccountsTableBody
                  accountId={a.id}
                  budgetMonths={budgetMonths}
                  activeBudgets={activeBudgets}
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
