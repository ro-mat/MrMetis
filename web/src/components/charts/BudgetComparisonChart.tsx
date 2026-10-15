import React, { FC, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BudgetPairArray } from "services/budgetPairArray";
import {
  budgetComparison,
  IBudgetComparisonRow,
  IChartMonth,
} from "services/chartData";
import { IBudget } from "store/userdata/userdata.types";
import { Button } from "components/ui";
import ChartTooltip from "./ChartTooltip";
import {
  axisProps,
  colors,
  compactAmount,
  seriesColor,
  useMonthLabel,
} from "./chartStyle";

interface IBudgetComparisonChartProps {
  budgetPairArray: BudgetPairArray;
  budgets: IBudget[];
  months: IChartMonth[];
  accountId?: number;
}

const ROW_HEIGHT = 40;

const isOver = (row: IBudgetComparisonRow) => row.actual > row.planned;

// Planned next to actual of each outgoing budget in one month. A budget with
// children opens them when clicked.
const BudgetComparisonChart: FC<IBudgetComparisonChartProps> = ({
  budgetPairArray,
  budgets,
  months,
  accountId,
}) => {
  const { t } = useTranslation();
  const monthLabel = useMonthLabel();

  const currentIndex = Math.max(
    months.findIndex((m) => !m.isForecast && m.month.isSame(new Date(), "M")),
    0,
  );
  const [selected, setSelected] = useState<number>();
  const monthIndex = Math.min(selected ?? currentIndex, months.length - 1);
  const month = months[monthIndex];

  const [parentId, setParentId] = useState<number>();
  const parent = budgets.find((b) => b.id === parentId);

  const rows = useMemo(
    () =>
      month
        ? budgetComparison(
            budgetPairArray,
            budgets,
            month.month,
            parentId,
            accountId,
          )
        : [],
    [budgetPairArray, budgets, month, parentId, accountId],
  );

  const open = (row?: IBudgetComparisonRow) => {
    if (row?.hasChildren) setParentId(row.budgetId);
  };

  if (!month) return null;

  return (
    <section className="chart-card">
      <h3>{t("charts.budgetComparison")}</h3>
      <div className="month-select">
        <div>
          <Button
            onClick={() => setSelected(monthIndex - 1)}
            disabled={monthIndex === 0}
          >
            {"<"}
          </Button>
        </div>
        <div className="month">{monthLabel(month.key)}</div>
        <div>
          <Button
            onClick={() => setSelected(monthIndex + 1)}
            disabled={monthIndex === months.length - 1}
          >
            {">"}
          </Button>
        </div>
      </div>
      {parent ? (
        <p className="chart-hint">
          <Button onClick={() => setParentId(parent.parentId)}>
            {"< "}
            {t("charts.back")}
          </Button>{" "}
          <strong>{parent.name}</strong>
        </p>
      ) : (
        rows.some((r) => r.hasChildren) && (
          <p className="chart-hint">{t("charts.budgetComparisonHint")}</p>
        )
      )}
      {rows.length === 0 ? (
        <p className="chart-hint">{t("charts.nothing")}</p>
      ) : (
        <ResponsiveContainer
          width="100%"
          height={rows.length * ROW_HEIGHT + 60}
        >
          <BarChart
            data={rows}
            layout="vertical"
            margin={{ top: 8, right: 16, left: 0 }}
            barGap={2}
          >
            <CartesianGrid stroke={colors.grid} horizontal={false} />
            <XAxis type="number" tickFormatter={compactAmount} {...axisProps} />
            <YAxis
              type="category"
              dataKey="name"
              width={120}
              {...axisProps}
              tick={{ ...axisProps.tick, cursor: "pointer" }}
              onClick={(tick: { index?: number }) =>
                open(tick.index !== undefined ? rows[tick.index] : undefined)
              }
            />
            <Tooltip
              content={
                <ChartTooltip
                  note={(row) =>
                    isOver(row as unknown as IBudgetComparisonRow)
                      ? t("charts.overspent")
                      : undefined
                  }
                />
              }
              cursor={{ fill: colors.grid, fillOpacity: 0.5 }}
            />
            <Legend />
            <Bar
              dataKey="planned"
              name={t("charts.planned")}
              fill={colors.other}
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(_, index) => open(rows[index])}
            />
            <Bar
              dataKey="actual"
              name={t("charts.actual")}
              fill={seriesColor(0)}
              radius={[0, 4, 4, 0]}
              maxBarSize={14}
              isAnimationActive={false}
              cursor="pointer"
              onClick={(_, index) => open(rows[index])}
            >
              {rows.map((r) => (
                <Cell
                  key={r.budgetId}
                  fill={isOver(r) ? colors.critical : seriesColor(0)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </section>
  );
};

export default BudgetComparisonChart;
