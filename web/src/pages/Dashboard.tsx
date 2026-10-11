import React, { useMemo, useState } from "react";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import moment from "moment";
import { useTranslation } from "react-i18next";
import RemainingPlannedExpences from "components/dashboard/RemainingPlannedExpences";
import CurrentBalance from "components/dashboard/CurrentBalance";
import ThisMonthStatements from "components/dashboard/ThisMonthStatements";
import { Button, NoData } from "components/ui";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useLocale from "hooks/useLocale";

const Dashboard = () => {
  const { t } = useTranslation();
  const { formatMonth } = useLocale();
  const { loaded } = useSelector((state: AppState) => state.data);

  const [relativeMonthNr, setRelativeMonth] = useState(0);
  const relativeMonth = useMemo(
    () => moment().add(relativeMonthNr, "M"),
    [relativeMonthNr]
  );

  const { budgetPairArray, isReady } = useBudgetCalculate(
    relativeMonthNr,
    relativeMonthNr
  );

  return (
    <>
      <h2>{t("dashboard.header")}</h2>
      <div className="month-select">
        <div>
          <Button onClick={() => setRelativeMonth((val) => val - 1)}>
            {"<"}
          </Button>
        </div>
        <div className={`month ${relativeMonthNr === 0 ? "current" : ""}`}>
          {formatMonth(relativeMonth)}
        </div>
        <div>
          <Button
            onClick={() => setRelativeMonth((val) => (val < 0 ? val + 1 : val))}
            disabled={relativeMonthNr === 0}
          >
            {">"}
          </Button>
        </div>
      </div>
      {isReady ? (
        <div className="dashboard-body">
          <CurrentBalance
            month={relativeMonth}
            budgetPairArray={budgetPairArray}
          />
          <RemainingPlannedExpences
            month={relativeMonth}
            budgetPairArray={budgetPairArray}
          />
          <ThisMonthStatements relativeMonthNr={relativeMonthNr} />
        </div>
      ) : loaded ? (
        <NoData message="noData.dashboard" />
      ) : (
        <div>Calculating...</div>
      )}
    </>
  );
};

export default Dashboard;
