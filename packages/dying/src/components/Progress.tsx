import React from "react";
import { cn } from "../utils/cn";

export interface ProgressBarProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  size?: "sm" | "md" | "lg";
  showValue?: boolean;
  label?: string;
  indeterminate?: boolean;
}

const barSizes = {
  sm: "h-1",
  md: "h-2",
  lg: "h-3",
};

export const ProgressBar = React.forwardRef<HTMLDivElement, ProgressBarProps>(
  (
    {
      className,
      value,
      max = 100,
      size = "md",
      showValue = false,
      label,
      indeterminate = false,
      ...props
    },
    ref
  ) => {
    const clamped = Math.max(0, Math.min(value, max));
    const percentage = max > 0 ? Math.round((clamped / max) * 100) : 0;

    return (
      <div ref={ref} className={cn("w-full space-y-1.5", className)} {...props}>
        {(label || showValue) && (
          <div className="flex items-center justify-between text-xs text-text-secondary">
            {label && <span className="font-medium text-text-primary">{label}</span>}
            {showValue && !indeterminate && (
              <span className="tabular-nums">{percentage}%</span>
            )}
          </div>
        )}
        <div
          role="progressbar"
          aria-label={label ?? "Progress"}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={indeterminate ? undefined : clamped}
          className={cn(
            "w-full overflow-hidden rounded-full bg-surface-active",
            barSizes[size]
          )}
        >
          <div
            className={cn(
              "h-full rounded-full bg-brand-primary transition-all duration-300",
              indeterminate && "w-1/3 animate-pulse"
            )}
            style={indeterminate ? undefined : { width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }
);

ProgressBar.displayName = "ProgressBar";

export interface ProgressRingProps extends React.SVGAttributes<SVGSVGElement> {
  value: number;
  max?: number;
  size?: number;
  strokeWidth?: number;
  showValue?: boolean;
  label?: string;
}

export const ProgressRing = React.forwardRef<SVGSVGElement, ProgressRingProps>(
  (
    {
      className,
      value,
      max = 100,
      size = 48,
      strokeWidth = 4,
      showValue = false,
      label,
      ...props
    },
    ref
  ) => {
    const clamped = Math.max(0, Math.min(value, max));
    const percentage = max > 0 ? clamped / max : 0;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference * (1 - percentage);

    return (
      <div
        className={cn("relative inline-flex items-center justify-center", className)}
        style={{ width: size, height: size }}
      >
        <svg
          ref={ref}
          width={size}
          height={size}
          viewBox={`0 0 ${size} ${size}`}
          role="progressbar"
          aria-label={label ?? "Progress"}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-valuenow={clamped}
          className="-rotate-90"
          {...props}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            className="stroke-surface-active"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="stroke-brand-primary transition-all duration-300"
          />
        </svg>
        {showValue && (
          <span className="absolute text-xs font-semibold tabular-nums text-text-primary">
            {Math.round(percentage * 100)}%
          </span>
        )}
      </div>
    );
  }
);

ProgressRing.displayName = "ProgressRing";
