import React, { useCallback, useMemo, useState } from "react";
import StatementTable from "components/StatementTable";
import useBudget, { IActiveBudget } from "hooks/useBudget";
import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { useTranslation } from "react-i18next";
import { getById } from "helpers/userdata";
import { BudgetTypeExtra, BudgetTypeUser } from "store/userdata/userdata.types";
import TableRow from "components/Planning/TableRow";
import { BudgetMonth } from "types/BudgetMonth";
import useBudgetAggregate from "hooks/useBudgetAggregate";

const Dashboard = () => {
  const { t } = useTranslation();

  const [relativeMonth, setRelativeMonth] = useState(0);

  const { statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { budgetMonth, activeBudgets } = useBudgetAggregate(
    moment().add(relativeMonth, "M").toDate()
  );
  const bmAccounts = useMemo(
    () => [...(budgetMonth.budgetMonthAccounts.values() ?? [])],
    [budgetMonth]
  );

  const isActiveBudgetRemaining = useCallback(
    (activeBudget: IActiveBudget, budgetMonth: BudgetMonth): boolean => {
      activeBudget.children = activeBudget.children.filter(
        (activeBudgetChild) =>
          isActiveBudgetRemaining(activeBudgetChild, budgetMonth)
      );
      const bi = budgetMonth.getItem(activeBudget.budgetId);

      return (
        bi !== undefined &&
        !(bi.budget.expectOneStatement && bi.actual > 0) &&
        !(bi.planned === 0 && activeBudget.children.length === 0) &&
        activeBudget.type !== BudgetTypeExtra.transferFromAccount &&
        activeBudget.type !== BudgetTypeUser.keepOnAccount
      );
    },
    []
  );

  const remainingActiveBudgets = useMemo(
    () =>
      activeBudgets.filter((activeBudget) =>
        isActiveBudgetRemaining(activeBudget, budgetMonth)
      ),
    [activeBudgets, budgetMonth, isActiveBudgetRemaining]
  );

  const monthStatements = useMemo(
    () =>
      statements.filter((s) =>
        moment(s.date).isSame(moment(budgetMonth.month), "M")
      ),
    [statements, budgetMonth]
  );

  return (
    <>
      <h2>{t("dashboard.header")}</h2>
      <div className="month-select">
        <div>
          <button
            className="small secondary"
            onClick={() => setRelativeMonth((val) => val - 1)}
          >
            {"<"}
          </button>
        </div>
        <div className={`month ${relativeMonth === 0 ? "current" : ""}`}>
          {moment(budgetMonth.month).format("YYYY-MM")}
        </div>
        <div>
          <button
            className="small secondary"
            onClick={() => setRelativeMonth((val) => (val < 0 ? val + 1 : val))}
            disabled={relativeMonth === 0}
          >
            {">"}
          </button>
        </div>
      </div>
      <div className="dashboard-body">
        <div>
          <h3>{t("dashboard.currentBalance")}</h3>
          <table>
            <tbody>
              {bmAccounts?.map((a) => (
                <tr>
                  <td>{getById(accounts, a.accountId)?.name}</td>
                  <td>{a.closingBalance?.actual.toFixed(2)}</td>
                </tr>
              ))}
              <tr>
                <td>
                  <strong>{t("dashboard.total")}</strong>
                </td>
                <td>
                  <strong>
                    {bmAccounts
                      .reduce(
                        (prev, cur) => prev + cur.closingBalance?.actual,
                        0
                      )
                      .toFixed(2)}
                  </strong>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div>
          <h3>{t("dashboard.remainingPlannedExpences")}</h3>
          <table className="planning-table">
            <thead>
              <tr>
                <th>{t("planning.name")}</th>
                <th>{t("planning.planned")}</th>
                <th>{t("planning.actual")}</th>
              </tr>
            </thead>
            <tbody>
              {remainingActiveBudgets.map((ab) => (
                <TableRow
                  key={ab.budgetId}
                  budgetId={ab.budgetId}
                  name={ab.name}
                  budgetItems={[budgetMonth]}
                  moreIsGood={ab.type === BudgetTypeUser.income}
                  children={ab.children}
                />
              ))}
            </tbody>
          </table>
        </div>
        <div>
          <h3>{t("dashboard.thisMonthStatements")}</h3>
          <StatementTable statements={monthStatements} />
        </div>
      </div>
    </>
  );
};

export default Dashboard;
