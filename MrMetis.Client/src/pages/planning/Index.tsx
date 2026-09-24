import React, { useMemo } from "react";
import ErrorBoundary from "components/ErrorBoundary";
import { useTranslation } from "react-i18next";
import { Outlet, useLocation } from "react-router-dom";
import { ToggleGroup } from "components/ui";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import { Moment } from "moment";
import { BudgetPairArray } from "services/budgetBuilder";

export type IPlanningProps = {
  months: Moment[];
  budgetPairArray: BudgetPairArray;
};

const subnavItems = [
  { value: "/planning/all", to: "/planning/all", label: "planning.all" },
  {
    value: "/planning/accounts",
    to: "/planning/accounts",
    label: "planning.perAccount",
  },
];

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
      <ToggleGroup
        id="planning-subnav"
        items={subnavItems}
        value={
          subnavItems.find((i) => location.pathname.startsWith(i.value))?.value
        }
      />
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
