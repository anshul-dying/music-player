import React, { useMemo } from "react";
import { cn } from "../utils/cn";

export interface ActivityHeatmapDay {
  date: string;
  count: number;
}

export interface ActivityHeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  data: ActivityHeatmapDay[];
  weeks?: number;
  title?: string;
}

const intensityClasses = [
  "bg-surface-active",
  "bg-brand-primary/25",
  "bg-brand-primary/50",
  "bg-brand-primary/75",
  "bg-brand-primary",
];

function getLevel(count: number, maxCount: number): number {
  if (count <= 0 || maxCount <= 0) return 0;
  const ratio = count / maxCount;
  if (ratio <= 0.25) return 1;
  if (ratio <= 0.5) return 2;
  if (ratio <= 0.75) return 3;
  return 4;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  weeks = 53,
  title = "Listening activity",
  className,
  ...props
}) => {
  const { columns, maxCount } = useMemo(() => {
    const totalCells = weeks * 7;
    const padded = new Array<ActivityHeatmapDay>(totalCells);
    const startIdx = Math.max(0, totalCells - data.length);
    let max = 0;

    for (let i = 0; i < totalCells; i++) {
      const sourceIdx = i - startIdx;
      const item =
        sourceIdx >= 0 && sourceIdx < data.length
          ? data[sourceIdx]
          : { date: "", count: 0 };
      padded[i] = item;
      if (item.count > max) max = item.count;
    }

    const cols: ActivityHeatmapDay[][] = [];
    for (let w = 0; w < weeks; w++) {
      cols.push(padded.slice(w * 7, w * 7 + 7));
    }
    return { columns: cols, maxCount: max };
  }, [data, weeks]);

  return (
    <div
      role="img"
      aria-label={title}
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface p-4 overflow-x-auto",
        className
      )}
      {...props}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-text-kicker">
          {title}
        </span>
        <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
          <span>Less</span>
          {intensityClasses.map((cls, idx) => (
            <span key={idx} className={cn("h-2.5 w-2.5 rounded-xs", cls)} />
          ))}
          <span>More</span>
        </div>
      </div>
      <div className="inline-flex gap-1">
        {columns.map((week, wIdx) => (
          <div key={wIdx} className="flex flex-col gap-1">
            {week.map((day, dIdx) => {
              const level = getLevel(day.count, maxCount);
              return (
                <div
                  key={`${wIdx}-${dIdx}`}
                  title={day.date ? `${day.date}: ${day.count}` : undefined}
                  className={cn(
                    "h-2.5 w-2.5 rounded-xs transition-colors",
                    intensityClasses[level]
                  )}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
ActivityHeatmap.displayName = "ActivityHeatmap";

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
