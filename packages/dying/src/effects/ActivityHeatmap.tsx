"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "../utils/cn";
import {
  buildHeatmapModel,
  DAY_MS,
  type ActivityHeatmapDay,
} from "./activityHeatmapModel";

export type { ActivityHeatmapDay } from "./activityHeatmapModel";

export interface ActivityHeatmapProps extends React.HTMLAttributes<HTMLDivElement> {
  data: ActivityHeatmapDay[];
  weeks?: number;
  title?: string;
  period?: string;
  unit?: { one: string; other: string };
  thresholds?: [number, number, number];
  weekStartsOn?: 0 | 1;
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  actions?: React.ReactNode;
  locale?: string;
}

const LEVEL_CLASSES = [
  "bg-surface-active/80 hover:ring-1 hover:ring-border-strong",
  "bg-brand-primary/25 hover:ring-1 hover:ring-brand-primary/60",
  "bg-brand-primary/50 hover:ring-1 hover:ring-brand-primary/80",
  "bg-brand-primary/75 hover:ring-1 hover:ring-brand-primary",
  "bg-brand-primary hover:ring-1 hover:ring-brand-hover",
] as const;

const WEEKDAYS_SUN = ["", "Mon", "", "Wed", "", "Fri", ""];
const WEEKDAYS_MON = ["Mon", "", "Wed", "", "Fri", "", ""];

interface TooltipState {
  date: string;
  count: number;
  x: number;
  y: number;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({
  data,
  weeks: minWeeks,
  title = "Listening activity",
  period,
  unit = { one: "stream", other: "streams" },
  thresholds,
  weekStartsOn = 0,
  selectedDate = null,
  onSelectDate,
  actions,
  locale = "en-US",
  className,
  ...props
}) => {
  const prefersReduced = useReducedMotion();
  const gridRef = useRef<HTMLDivElement>(null);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);

  const model = useMemo(
    () => buildHeatmapModel(data, weekStartsOn, thresholds, locale, minWeeks),
    [data, weekStartsOn, thresholds, locale, minWeeks]
  );

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      }),
    [locale]
  );

  const numFmt = useMemo(() => new Intl.NumberFormat(locale), [locale]);
  const weekdayLabels = weekStartsOn === 1 ? WEEKDAYS_MON : WEEKDAYS_SUN;

  const updateTooltipFromEl = useCallback((el: HTMLElement, idx: number) => {
    const host = gridRef.current;
    if (!host) return;
    const hostRect = host.getBoundingClientRect();
    const cellRect = el.getBoundingClientRect();
    setTooltip({
      date: model.dates[idx],
      count: model.counts[idx],
      x: cellRect.left - hostRect.left + cellRect.width / 2,
      y: cellRect.top - hostRect.top,
    });
  }, [model.counts, model.dates]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>, idx: number) => {
      let nextIdx = idx;
      if (e.key === "ArrowRight") nextIdx = idx + 7;
      else if (e.key === "ArrowLeft") nextIdx = idx - 7;
      else if (e.key === "ArrowDown") nextIdx = idx + 1;
      else if (e.key === "ArrowUp") nextIdx = idx - 1;
      else if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onSelectDate?.(model.dates[idx]);
        return;
      } else {
        return;
      }
      e.preventDefault();
      if (nextIdx >= 0 && nextIdx < model.dates.length) {
        const target = gridRef.current?.querySelector<HTMLButtonElement>(
          `[data-heatmap-idx="${nextIdx}"]`
        );
        target?.focus();
      }
    },
    [model.dates, onSelectDate]
  );

  const summaryUnit = model.total === 1 ? unit.one : unit.other;

  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "rounded-2xl border border-border-subtle bg-surface p-4 sm:p-5",
        className
      )}
      {...props}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-baseline gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-kicker">
            {title}
          </span>
          <span className="text-xs text-text-secondary tabular-nums">
            {numFmt.format(model.total)} {summaryUnit}
            {period ? ` in ${period}` : ""}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {actions}
          <div className="flex items-center gap-1 text-[11px] text-text-tertiary">
            <span>Less</span>
            {LEVEL_CLASSES.map((cls, idx) => (
              <span key={idx} className={cn("h-2.5 w-2.5 rounded-xs", cls.split(" ")[0])} />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      <div ref={gridRef} className="relative">
        <AnimatePresence>
          {tooltip && (
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 4, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.14 }}
              style={{ left: tooltip.x, top: tooltip.y - 8 }}
              className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg border border-border-subtle bg-surface-elevated px-2.5 py-1.5 text-xs shadow-lg"
            >
              <span className="font-semibold text-text-primary tabular-nums">
                {numFmt.format(tooltip.count)} {tooltip.count === 1 ? unit.one : unit.other}
              </span>{" "}
              <span className="text-text-secondary">
                on {dateFmt.format(new Date(Date.parse(`${tooltip.date}T00:00:00Z`)))}
              </span>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto pb-1">

        <div className="inline-flex flex-col gap-1.5 min-w-max">
          <div className="relative ml-7 h-4 text-[10px] text-text-tertiary">
            {model.months.map((m) => (
              <span
                key={`${m.month}-${m.col}`}
                style={{ left: `${m.col * 14}px` }}
                className="absolute top-0"
              >
                {m.label}
              </span>
            ))}
          </div>

          <div className="flex gap-1.5">
            <div className="flex flex-col gap-1 pr-1 text-[10px] leading-[10px] text-text-tertiary select-none">
              {weekdayLabels.map((lbl, i) => (
                <span key={i} className="h-2.5 w-5 text-right">
                  {lbl}
                </span>
              ))}
            </div>

            <div className="inline-flex gap-1" onMouseLeave={() => setTooltip(null)}>
              {Array.from({ length: model.weeks }, (_, col) => (
                <div key={col} className="flex flex-col gap-1">
                  {Array.from({ length: 7 }, (_, row) => {
                    const idx = col * 7 + row - model.lead;
                    if (idx < 0 || idx >= model.dates.length) {
                      return <span key={row} className="h-2.5 w-2.5" aria-hidden="true" />;
                    }
                    const date = model.dates[idx];
                    const count = model.counts[idx];
                    const level = model.levels[idx];
                    const isSelected = selectedDate === date;
                    const waveDelay = prefersReduced
                      ? 0
                      : Math.min(0.42, (col / Math.max(1, model.weeks)) * 0.42);
                    const formattedDate = dateFmt.format(
                      new Date(model.startMs + idx * DAY_MS)
                    );

                    return (
                      <motion.button
                        key={date}
                        type="button"
                        data-heatmap-idx={idx}
                        aria-label={`${count} ${count === 1 ? unit.one : unit.other} on ${formattedDate}`}
                        aria-pressed={isSelected}
                        initial={prefersReduced ? false : { opacity: 0, scale: 0.7 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.2, delay: waveDelay }}
                        onMouseEnter={(e) => updateTooltipFromEl(e.currentTarget, idx)}
                        onFocus={(e) => updateTooltipFromEl(e.currentTarget, idx)}
                        onBlur={() => setTooltip(null)}
                        onClick={() => onSelectDate?.(date)}
                        onKeyDown={(e) => handleKeyDown(e, idx)}
                        className={cn(
                          "h-2.5 w-2.5 rounded-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary",
                          LEVEL_CLASSES[level],
                          isSelected && "ring-2 ring-text-primary"
                        )}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
};
ActivityHeatmap.displayName = "ActivityHeatmap";
