import React, { useMemo } from "react";
import { cn } from "../utils/cn";
export {
  ActivityHeatmap,
  type ActivityHeatmapDay,
  type ActivityHeatmapProps,
} from "./ActivityHeatmap";

export interface MetricBarDatum {
  label: string;
  value: number;
  hint?: string;
}

export interface MetricBarChartProps extends React.HTMLAttributes<HTMLDivElement> {
  data: MetricBarDatum[];
  max?: number;
  height?: number;
  formatValue?: (value: number) => string;
}

export const MetricBarChart: React.FC<MetricBarChartProps> = ({
  data,
  max,
  height = 140,
  formatValue = (v) => String(v),
  className,
  ...props
}) => {
  const maxVal = useMemo(() => {
    if (max !== undefined && max > 0) return max;
    return Math.max(1, ...data.map((d) => d.value));
  }, [data, max]);

  return (
    <div
      role="img"
      aria-label="Metric bar chart"
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface p-4",
        className
      )}
      {...props}
    >
      <div className="flex items-end gap-2" style={{ height }}>
        {data.map((item) => {
          const pct = Math.max(0, Math.min(100, (item.value / maxVal) * 100));
          return (
            <div
              key={item.label}
              className="group flex flex-1 flex-col items-center gap-1.5 h-full justify-end min-w-0"
            >
              <span className="text-[11px] font-medium tabular-nums text-text-secondary opacity-0 transition-opacity group-hover:opacity-100">
                {formatValue(item.value)}
              </span>
              <div className="relative flex w-full flex-1 items-end overflow-hidden rounded-t-md bg-surface-active">
                <div
                  title={item.hint ?? `${item.label}: ${formatValue(item.value)}`}
                  style={{ height: `${pct}%` }}
                  className="w-full rounded-t-md bg-brand-primary transition-all duration-300 group-hover:bg-brand-hover"
                />
              </div>
              <span className="w-full truncate text-center text-[11px] text-text-tertiary">
                {item.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
MetricBarChart.displayName = "MetricBarChart";
