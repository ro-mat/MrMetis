import React, { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetPairArray } from "services/budgetPairArray";
import { accountKey, balanceSeries, IChartMonth } from "services/chartData";
import { IAccount } from "store/userdata/userdata.types";
import ChartTooltip from "./ChartTooltip";
import {
  axisProps,
  colors,
  compactAmount,
  SERIES_COUNT,
  seriesColor,
  useMonthLabel,
} from "./chartStyle";

interface IBalanceChartProps {
  budgetPairArray: BudgetPairArray;
  months: IChartMonth[];
  accounts: IAccount[];
  // only this account, no total
  accountId?: number;
}

// The balance at the end of each month: where the money is heading.
const BalanceChart: FC<IBalanceChartProps> = ({
  budgetPairArray,
  months,
  accounts,
  accountId,
}) => {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();

  const rows = useMemo(
    () => balanceSeries(budgetPairArray, accounts, months),
    [budgetPairArray, accounts, months],
  );
  const forecast = months.filter((m) => m.isForecast);

  // each account keeps its slot whichever is shown
  const lines = accounts
    .map((a, i) => ({ key: accountKey(a.id), name: a.name, slot: i, id: a.id }))
    .filter((l) => (accountId ? l.id === accountId : true))
    .filter((l) => l.slot < SERIES_COUNT);

  return (
    <section className="chart-card">
      <h3>{t("charts.balance")}</h3>
      <p className="chart-hint">{t("charts.balanceHint")}</p>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={rows} margin={{ top: 16, right: 16, left: 0 }}>
          <CartesianGrid stroke={colors.grid} vertical={false} />
          {forecast.length > 0 && (
            <ReferenceArea
              x1={forecast[0].key}
              x2={forecast[forecast.length - 1].key}
              fill={colors.forecast}
              fillOpacity={1}
              label={{
                value: t("charts.forecast"),
                position: "insideTopRight",
                fill: colors.muted,
                fontSize: 13,
              }}
            />
          )}
          <ReferenceLine y={0} stroke={colors.axis} />
          <XAxis dataKey="month" tickFormatter={monthLabel} {...axisProps} />
          <YAxis tickFormatter={compactAmount} width={48} {...axisProps} />
          <Tooltip
            content={<ChartTooltip formatLabel={monthLabel} />}
            cursor={{ stroke: colors.axis }}
          />
          <Legend />
          {lines.map((l) => (
            <Line
              key={l.key}
              dataKey={l.key}
              name={l.name}
              stroke={seriesColor(l.slot)}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          ))}
          {!accountId && accounts.length > 1 && (
            <Line
              dataKey="total"
              name={t("charts.total")}
              stroke={colors.text}
              strokeWidth={2}
              strokeDasharray="6 4"
              dot={false}
              activeDot={{ r: 4, stroke: colors.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </section>
  );
};

export default BalanceChart;
