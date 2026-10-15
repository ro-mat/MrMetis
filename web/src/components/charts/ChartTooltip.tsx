import React from "react";
import { TooltipContentProps } from "recharts";
import useLocale from "hooks/useLocale";

interface IChartTooltipProps extends Partial<
  TooltipContentProps<number, string>
> {
  formatLabel?: (label: string) => string;
  // an extra line under the values, e.g. that a budget is over its plan
  note?: (row: Record<string, unknown>) => string | undefined;
}

// Recharts fills in the hover state (active, payload, label) when it's passed
// as an element: <Tooltip content={<ChartTooltip />} />
const ChartTooltip = ({
  active,
  payload,
  label,
  formatLabel,
  note,
}: IChartTooltipProps) => {
  const { formatAmount } = useLocale();
  if (!active || !payload?.length) return null;

  const text = note?.(payload[0].payload);

  return (
    <div className="chart-tooltip">
      <div className="chart-tooltip-label">
        {formatLabel ? formatLabel(String(label)) : label}
      </div>
      <table>
        <tbody>
          {payload.map((p) => (
            <tr key={String(p.dataKey)}>
              <td>
                <span
                  className="chart-swatch"
                  style={{ background: p.color }}
                />
                {p.name}
              </td>
              <td>{formatAmount(Number(p.value))}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {text && <div className="chart-tooltip-note">{text}</div>}
    </div>
  );
};

export default ChartTooltip;
