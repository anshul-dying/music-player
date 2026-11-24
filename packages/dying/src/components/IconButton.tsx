import React from "react";
import { cn } from "../utils/cn";
import { Spinner } from "./Spinner";

export interface IconButtonProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: React.ReactNode;
  "aria-label": string;
  variant?: "primary" | "accent" | "secondary" | "glass" | "ghost" | "outline" | "danger";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  shape?: "rounded" | "circle";
  isLoading?: boolean;
}

const variantStyles = {
  primary:
    "bg-text-primary text-text-inverse font-semibold hover:opacity-90 active:opacity-80 shadow-md shadow-black/30",
  accent:
    "bg-brand-primary text-brand-on-primary font-semibold hover:bg-brand-hover shadow-md shadow-brand-glow",
  secondary:
    "bg-surface-active text-text-primary hover:bg-surface-hover active:bg-surface border border-border-subtle",
  glass:
    "bg-glass-frosted text-text-primary backdrop-blur-xl border border-border-subtle hover:bg-surface-hover hover:border-border-muted shadow-md shadow-black/40 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.2] before:to-transparent",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]",
  outline:
    "border border-border-muted bg-transparent text-text-primary hover:bg-[var(--state-hover)] hover:border-border-focus active:bg-[var(--state-pressed)]",
  danger:
    "bg-status-error text-white hover:bg-rose-600 active:bg-rose-700 shadow-md shadow-rose-950/40",
};

const sizeStyles = {
  xs: "h-7 w-7 text-xs",
  sm: "h-9 w-9 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-13 w-13 text-base",
  xl: "h-16 w-16 text-lg",
};

const shapeStyles = {
  rounded: {
    xs: "rounded-lg",
    sm: "rounded-xl",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-2xl",
  },
  circle: {
    xs: "rounded-full",
    sm: "rounded-full",
    md: "rounded-full",
    lg: "rounded-full",
    xl: "rounded-full",
  },
};

export const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  (
    {
      className,
      icon,
      "aria-label": ariaLabel,
      variant = "glass",
      size = "md",
      shape = "rounded",
      type = "button",
      isLoading = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || isLoading;

    return (
      <button
        ref={ref}
        type={type}
        disabled={isDisabled}
        aria-label={ariaLabel}
        className={cn(
          "dying-touch-target relative inline-flex items-center justify-center transition-all duration-200 select-none cursor-pointer shrink-0",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "active:scale-[0.94]",
          variantStyles[variant],
          sizeStyles[size],
          shapeStyles[shape][size],
          isDisabled && "cursor-not-allowed opacity-50 active:scale-100",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <Spinner size={size === "xs" || size === "sm" ? "xs" : "sm"} />
        ) : (
          icon
        )}
      </button>
    );
  }
);

IconButton.displayName = "IconButton";

export interface ButtonGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  attached?: boolean;
}

export const ButtonGroup = React.forwardRef<HTMLDivElement, ButtonGroupProps>(
  ({ className, attached = false, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        role="group"
        className={cn(
          "inline-flex items-center",
          attached
            ? "[&>button:not(:first-child)]:rounded-l-none [&>button:not(:last-child)]:rounded-r-none [&>button:not(:last-child)]:border-r-0"
            : "gap-2",
          className
        )}
        {...props}
      >
        {children}
      </div>
    );
  }
);

ButtonGroup.displayName = "ButtonGroup";
