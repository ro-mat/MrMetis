import React, { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetPairArray } from "services/budgetPairArray";
import { IChartMonth, OTHER_KEY, spendingBreakdown } from "services/chartData";
import { IBudget } from "store/userdata/userdata.types";
import ChartTooltip from "./ChartTooltip";
import {
  axisProps,
  colors,
  compactAmount,
  SERIES_COUNT,
  seriesColor,
  useMonthLabel,
} from "./chartStyle";

interface ISpendingBreakdownChartProps {
  budgetPairArray: BudgetPairArray;
  budgets: IBudget[];
  months: IChartMonth[];
  accountId?: number;
}

// Where the money goes each month, by top level spending budget.
const SpendingBreakdownChart: FC<ISpendingBreakdownChartProps> = ({
  budgetPairArray,
  budgets,
  months,
  accountId,
}) => {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();

  const { series, rows } = useMemo(
    // one slot is left for "other"
    () =>
      spendingBreakdown(
        budgetPairArray,
        budgets,
        months,
        accountId,
        SERIES_COUNT - 1,
      ),
    [budgetPairArray, budgets, months, accountId],
  );

  return (
    <section className="chart-card">
      <h3>{t("charts.spendingBreakdown")}</h3>
      {series.length === 0 ? (
        <p className="chart-hint">{t("charts.nothing")}</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <BarChart data={rows} margin={{ top: 16, right: 16, left: 0 }}>
            <CartesianGrid stroke={colors.grid} vertical={false} />
            <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
            <YAxis tickFormatter={compactAmount} width={48} {...axisProps} />
            <Tooltip
              content={<ChartTooltip formatLabel={monthLabel} />}
              cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            />
            <Legend />
            {series.map((s, i) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.key === OTHER_KEY ? t("charts.other") : s.name}
                stackId="spending"
                fill={s.key === OTHER_KEY ? colors.other : seriesColor(i)}
                // the surface between segments keeps them apart
                stroke={colors.surface}
                strokeWidth={2}
                maxBarSize={40}
                isAnimationActive={false}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
};

export default SpendingBreakdownChart;
