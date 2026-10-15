import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSelector } from "react-redux";
import { AppState } from "store/store";
import useBudgetCalculate from "hooks/useBudgetCalculate";
import useAccount from "hooks/useAccount";
import useBudget from "hooks/useBudget";
import { chartMonths } from "services/chartData";
import { NoData, ToggleGroup } from "components/ui";
import CalculationError from "components/CalculationError";
import BalanceChart from "components/charts/BalanceChart";
import IncomeOutgoingChart from "components/charts/IncomeOutgoingChart";
import BudgetComparisonChart from "components/charts/BudgetComparisonChart";
import SpendingBreakdownChart from "components/charts/SpendingBreakdownChart";
import MasonryGrid from "components/charts/MasonryGrid";

const ALL = "all";

const ChartsPage = () => {
  const { t } = useTranslation();
  const { loaded } = useSelector((state: AppState) => state.data);
  const { fromRelativeMonth: from, toRelativeMonth: to } = useSelector(
    (state: AppState) => state.ui.ui.filters.charts,
  );
  const { accounts } = useAccount();
  const { budgets } = useBudget();

  const months = useMemo(() => chartMonths(from, to), [from, to]);

  const { budgetPairArray, isReady, error } = useBudgetCalculate(from, to);

  const [account, setAccount] = useState(ALL);
  const accountId = account === ALL ? undefined : Number(account);

  const accountItems = [
    { value: ALL, label: t("charts.allAccounts") },
    ...accounts.map((a) => ({ value: String(a.id), label: a.name })),
  ];

  return (
    <>
      <h2>{t("charts.header")}</h2>
      {error ? (
        <CalculationError error={error} />
      ) : isReady ? (
        <>
          {accounts.length > 1 && (
            <ToggleGroup
              className="chart-filter"
              items={accountItems}
              value={account}
              onChange={setAccount}
              translate={false}
            />
          )}
          <MasonryGrid className="charts">
            <BalanceChart
              budgetPairArray={budgetPairArray}
              months={months}
              accounts={accounts}
              accountId={accountId}
            />
            <IncomeOutgoingChart
              budgetPairArray={budgetPairArray}
              months={months}
              accountId={accountId}
            />
            <BudgetComparisonChart
              budgetPairArray={budgetPairArray}
              budgets={budgets}
              months={months}
              accountId={accountId}
            />
            <SpendingBreakdownChart
              budgetPairArray={budgetPairArray}
              budgets={budgets}
              months={months}
              accountId={accountId}
            />
          </MasonryGrid>
        </>
      ) : loaded ? (
        <NoData message="noData.charts" />
      ) : (
        <div>Calculating...</div>
      )}
    </>
  );
};

export default ChartsPage;
