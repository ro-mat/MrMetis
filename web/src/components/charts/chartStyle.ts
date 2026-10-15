import moment from "moment";
import { useCallback } from "react";
import useLocale from "hooks/useLocale";

// Colors are CSS variables (styles/charts.scss), so the dark theme swaps them.
// Categorical slots go in this fixed order and are never cycled.
export const seriesColor = (slot: number) => `var(--series-${slot + 1})`;
export const SERIES_COUNT = 8;

export const colors = {
  text: "var(--chart-text)",
  muted: "var(--chart-muted)",
  grid: "var(--chart-grid)",
  axis: "var(--chart-axis)",
  surface: "var(--chart-surface)",
  forecast: "var(--chart-forecast)",
  other: "var(--chart-other)",
  critical: "var(--status-critical)",
};

export const axisProps = {
  stroke: colors.axis,
  tick: { fill: colors.muted, fontSize: 13 },
  tickLine: false,
};

// month keys (YYYY-MM) as the user's locale shows months
export const useMonthLabel = () => {
  const { formatMonth } = useLocale();
  return useCallback(
    (key: string) => formatMonth(moment(key, "YYYY-MM")),
    [formatMonth],
  );
};

// short amounts for axis ticks, e.g. 12k
export const compactAmount = (value: number) =>
  Math.abs(value) >= 1000
    ? `${Math.round(value / 100) / 10}k`
    : String(Math.round(value));
