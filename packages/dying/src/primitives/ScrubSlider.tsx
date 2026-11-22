import React, { useState, useRef } from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "../utils/cn";

export interface ScrubSliderProps
  extends Omit<
    React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>,
    "value" | "defaultValue" | "onValueChange" | "onValueCommit"
  > {
  value?: number;
  defaultValue?: number;
  onValueChange?: (val: number) => void;
  onValueCommit?: (val: number) => void;
  buffered?: number; // 0 to 100 percentage
  tooltipFormatter?: (val: number) => string;
  showThumbOnHoverOnly?: boolean;
  size?: "sm" | "md" | "lg";
  accentColor?: string;
}

export const ScrubSlider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  ScrubSliderProps
>(
  (
    {
      className,
      value,
      defaultValue = 0,
      onValueChange,
      onValueCommit,
      min = 0,
      max = 100,
      step = 1,
      buffered = 0,
      tooltipFormatter,
      showThumbOnHoverOnly = true,
      size = "md",
      accentColor,
      disabled,
      ...props
    },
    ref
  ) => {
    const [hoverPos, setHoverPos] = useState<number | null>(null);
    const [hoverValue, setHoverValue] = useState<number | null>(null);
    const [isScrubbing, setIsScrubbing] = useState(false);
    const [scrubValue, setScrubValue] = useState<number | null>(null);
    const trackRef = useRef<HTMLDivElement>(null);

    const handleValueChange = (vals: number[]) => {
      setIsScrubbing(true);
      setScrubValue(vals[0]);
      onValueChange?.(vals[0]);
    };

    const handleValueCommit = (vals: number[]) => {
      setIsScrubbing(false);
      setScrubValue(null);
      onValueCommit?.(vals[0]);
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      if (!trackRef.current || !tooltipFormatter || disabled) return;
      const rect = trackRef.current.getBoundingClientRect();
      const clientX = Math.max(rect.left, Math.min(e.clientX, rect.right));
      const percentage = (clientX - rect.left) / rect.width;
      const calcValue = min + percentage * (max - min);
      setHoverPos(percentage * 100);
      setHoverValue(calcValue);
    };

    const handleMouseLeave = () => {
      setHoverPos(null);
      setHoverValue(null);
    };

    const heightClasses = {
      sm: "h-1 group-hover:h-1.5",
      md: "h-1.5 group-hover:h-2",
      lg: "h-2 group-hover:h-2.5",
    };

    const thumbSizes = {
      sm: "h-2.5 w-2.5",
      md: "h-3.5 w-3.5",
      lg: "h-4 w-4",
    };

    const effectiveValue =
      isScrubbing && scrubValue !== null
        ? [scrubValue]
        : value !== undefined
        ? [value]
        : undefined;
    const defaultVal = defaultValue !== undefined ? [defaultValue] : [0];

    return (
      <div
        className="group relative flex w-full touch-none select-none items-center py-2"
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
      >
        {/* Tooltip on hover */}
        {tooltipFormatter && hoverPos !== null && hoverValue !== null && (
          <div
            className="pointer-events-none absolute -top-8 z-30 -translate-x-1/2 rounded-md border border-border-subtle bg-surface/95 px-2 py-0.5 text-[10px] font-medium tracking-wider text-text-primary shadow-xl backdrop-blur-md transition-opacity"
            style={{ left: `${hoverPos}%` }}
          >
            {tooltipFormatter(hoverValue)}
          </div>
        )}

        <SliderPrimitive.Root
          ref={ref}
          className={cn(
            "relative flex w-full touch-none select-none items-center cursor-pointer",
            disabled && "cursor-not-allowed opacity-40",
            className
          )}
          value={effectiveValue}
          defaultValue={defaultVal}
          onValueChange={handleValueChange}
          onValueCommit={handleValueCommit}
          onPointerDown={(e) => {
            setIsScrubbing(true);
            props.onPointerDown?.(e);
          }}
          onPointerCancel={(e) => {
            setIsScrubbing(false);
            setScrubValue(null);
            props.onPointerCancel?.(e);
          }}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          {...props}
        >
          <SliderPrimitive.Track
            ref={trackRef}
            className={cn(
              "relative w-full grow overflow-hidden rounded-full bg-white/[0.12] transition-all duration-150 ease-out",
              heightClasses[size]
            )}
          >
            {/* Buffered progress track */}
            {buffered > 0 && (
              <div
                className="absolute inset-y-0 left-0 bg-white/[0.22] transition-all duration-200"
                style={{ width: `${Math.min(100, Math.max(0, buffered))}%` }}
              />
            )}

            {/* Active played range */}
            <SliderPrimitive.Range
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-75"
              style={{
                backgroundColor: accentColor || "rgb(255 255 255)",
              }}
            />
          </SliderPrimitive.Track>

          {/* Tactile thumb */}
          <SliderPrimitive.Thumb
            className={cn(
              "block rounded-full border border-black/20 bg-white shadow-lg ring-0 transition-all duration-150 ease-out focus:outline-none focus-visible:scale-125 focus-visible:ring-2 focus-visible:ring-white/50",
              thumbSizes[size],
              showThumbOnHoverOnly && "opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 focus:opacity-100 focus:scale-100"
            )}
            style={
              accentColor
                ? {
                    boxShadow: `0 0 10px ${accentColor}`,
                  }
                : undefined
            }
          />
        </SliderPrimitive.Root>
      </div>
    );
  }
);

ScrubSlider.displayName = "ScrubSlider";
