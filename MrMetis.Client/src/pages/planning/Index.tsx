import React, { useMemo } from "react";
import ErrorBoundary from "components/ErrorBoundary";
import { useTranslation } from "react-i18next";
import { Link, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import { Moment } from "moment";
import { BudgetPairArray } from "services/budgetBuilder";

export type IPlanningProps = {
  months: Moment[];
  budgetPairArray: BudgetPairArray;
};

const Planning = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const { filter } = useSelector((state: AppState) => state.ui.ui);

  const { budgetPairArray, isReady } = useBudgetCalculate(
    filter.fromRelativeMonth,
    filter.toRelativeMonth
  );
  const months = useMemo(
    () => budgetPairArray.getActiveMonths(),
    [budgetPairArray]
  );

  return (
    <>
      <h2>{t("planning.header")}</h2>
      <div id="planning-subnav">
        <Link
          to="/planning/all"
          className={`btn small ${
            location.pathname.startsWith("/planning/all")
              ? "primary"
              : "secondary"
          }`}
        >
          {t("planning.all")}
        </Link>
        <Link
          to="/planning/accounts"
          className={`btn small  ${
            location.pathname.startsWith("/planning/accounts")
              ? "primary"
              : "secondary"
          }`}
        >
          {t("planning.perAccount")}
        </Link>
      </div>
      <ErrorBoundary>
        {isReady ? (
          <Outlet context={{ months, budgetPairArray }} />
        ) : (
          <div>Calculating...</div>
        )}
      </ErrorBoundary>
    </>
  );
};

export default Planning;
