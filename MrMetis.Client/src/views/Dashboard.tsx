import React, { useMemo, useState } from "react";
import TableCellPair from "components/Planning/TableCellPair";
import StatementTable from "components/StatementTable";
import useBudget from "hooks/useBudget";
import moment from "moment";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import { useTranslation } from "react-i18next";
import { getById } from "helpers/userdata";
import { BudgetTypeExtra } from "store/userdata/userdata.types";

const Dashboard = () => {
  const { t } = useTranslation();

  const [relativeMonth, setRelativeMonth] = useState(0);

  const { statements, accounts } = useSelector(
    (state: AppState) => state.data.userdata
  );
  const { budgetMonths } = useBudget(relativeMonth - 1, relativeMonth);
  const bm = useMemo(() => budgetMonths[1], [budgetMonths]);
  const bmAccounts = useMemo(() => [...bm.budgetMonthAccounts.values()], [bm]);
  const remainingBudgetItems = useMemo(
    () =>
      bm.list.filter(
        (item) =>
          !(item.budget.expectOneStatement && item.actual > 0) &&
          (item.planned > 0 || item.children.getTotalPlanned() > 0) &&
          item.type !== BudgetTypeExtra.transferFromAccount
      ),
    [bm]
  );

  const monthStatements = useMemo(
    () =>
      statements.filter((s) => moment(s.date).isSame(moment(bm.month), "M")),
    [statements, bm]
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
          {moment(bm.month).format("YYYY-MM")}
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
              {bmAccounts.map((a) => (
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
          <h3>{t("dashboard.thisMonthStatements")}</h3>
          <StatementTable statements={monthStatements} />
        </div>
        <div>
          <h3>{t("dashboard.remainingPlannedExpences")}</h3>
          <table>
            <thead>
              <tr>
                <th>{t("planning.name")}</th>
                <th>{t("planning.planned")}</th>
                <th>{t("planning.actual")}</th>
              </tr>
            </thead>
            <tbody>
              {remainingBudgetItems.map((bi) => (
                <tr key={bi.id}>
                  <td>{bi.name}</td>
                  <TableCellPair
                    valuePlanned={bi.planned}
                    valueActual={bi.actual}
                    statements={bi.statements}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

export default Dashboard;
