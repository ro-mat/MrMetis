import React, { FC, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetPairArray } from "services/budgetPairArray";
import { IChartMonth, incomeOutgoingSeries } from "services/chartData";
import ChartTooltip from "./ChartTooltip";
import {
  axisProps,
  colors,
  compactAmount,
  seriesColor,
  useMonthLabel,
} from "./chartStyle";

interface IIncomeOutgoingChartProps {
  budgetPairArray: BudgetPairArray;
  months: IChartMonth[];
  accountId?: number;
}

// Income next to outgoings each month, and what is left of the difference.
const IncomeOutgoingChart: FC<IIncomeOutgoingChartProps> = ({
  budgetPairArray,
  months,
  accountId,
}) => {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();

  const rows = useMemo(
    () => incomeOutgoingSeries(budgetPairArray, months, accountId),
    [budgetPairArray, months, accountId],
  );
  const forecast = months.filter((m) => m.isForecast);

  return (
    <section className="chart-card">
      <h3>{t("charts.incomeOutgoings")}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <ComposedChart
          data={rows}
          margin={{ top: 16, right: 16, left: 0 }}
          barGap={2}
        >
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
            cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
          />
          <Legend />
          <Bar
            dataKey="income"
            name={t("charts.income")}
            fill={seriesColor(0)}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <Bar
            dataKey="outgoings"
            name={t("charts.outgoings")}
            fill={seriesColor(1)}
            radius={[4, 4, 0, 0]}
            maxBarSize={28}
            isAnimationActive={false}
          />
          <Line
            dataKey="net"
            name={t("charts.net")}
            stroke={colors.text}
            strokeWidth={2}
            dot={{
              r: 4,
              fill: colors.text,
              stroke: colors.surface,
              strokeWidth: 2,
            }}
            isAnimationActive={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </section>
  );
};

export default IncomeOutgoingChart;
