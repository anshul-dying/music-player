import React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../utils/cn";

export interface SliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    "value" | "defaultValue" | "onValueChange" | "onValueCommit"
  > {
  value?: number[];
  defaultValue?: number[];
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  label?: string;
  showValue?: boolean;
  formatValue?: (val: number) => string;
  size?: "sm" | "md" | "lg";
}

const trackSizeStyles = {
  horizontal: { sm: "h-1", md: "h-1.5", lg: "h-2" },
  vertical: { sm: "w-1", md: "w-1.5", lg: "w-2" },
};

const thumbSizeStyles = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

export const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(
  (
    {
      className,
      value,
      defaultValue = [0],
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      orientation = "horizontal",
      label,
      showValue = false,
      formatValue = (v) => String(v),
      size = "md",
      disabled,
      ...props
    },
    ref
  ) => {
    const isVertical = orientation === "vertical";
    const displayValues = value ?? defaultValue;
    const thumbCount = Math.max(1, displayValues.length);

    return (
      <div
        className={cn(
          "flex gap-2",
          isVertical ? "flex-col items-center h-full" : "flex-col w-full",
          className
        )}
      >
        {(label || showValue) && (
          <div className="flex w-full items-center justify-between text-xs text-text-secondary">
            {label && <span className="font-medium text-text-primary">{label}</span>}
            {showValue && (
              <span className="tabular-nums">
                {displayValues.map(formatValue).join(" – ")}
              </span>
            )}
          </div>
        )}
        <SliderPrimitive.Root
          ref={ref}
          value={value}
          defaultValue={value === undefined ? defaultValue : undefined}
          onValueChange={onValueChange}
          onValueCommit={onValueCommit}
          min={min}
          max={max}
          step={step}
          orientation={orientation}
          disabled={disabled}
          aria-label={props["aria-label"] ?? label ?? "Slider"}
          className={cn(
            "relative flex touch-none select-none items-center",
            isVertical ? "h-full min-h-32 w-5 flex-col justify-center" : "h-5 w-full",
            disabled && "cursor-not-allowed opacity-50"
          )}
          {...props}
        >
          <SliderPrimitive.Track
            className={cn(
              "relative grow overflow-hidden rounded-full bg-surface-active",
              isVertical
                ? cn("h-full", trackSizeStyles.vertical[size])
                : cn("w-full", trackSizeStyles.horizontal[size])
            )}
          >
            <SliderPrimitive.Range
              className={cn(
                "absolute bg-brand-primary",
                isVertical ? "w-full" : "h-full"
              )}
            />
          </SliderPrimitive.Track>
          {Array.from({ length: thumbCount }).map((_, idx) => (
            <SliderPrimitive.Thumb
              key={idx}
              className={cn(
                "dying-touch-target block rounded-full border-2 border-brand-primary bg-text-primary shadow-md transition-transform",
                "hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
                thumbSizeStyles[size]
              )}
            />
          ))}
        </SliderPrimitive.Root>
      </div>
    );
  }
);

Slider.displayName = "Slider";
