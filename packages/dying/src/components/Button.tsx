import React from "react";
import { cn } from "../utils/cn";
import { Spinner } from "./Spinner";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "accent" | "secondary" | "glass" | "ghost" | "outline" | "danger" | "pill";
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  isLoading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
}

const variantStyles = {
  primary:
    "bg-text-primary text-text-inverse font-semibold hover:opacity-90 active:opacity-80 shadow-md shadow-black/30",
  accent:
    "bg-brand-primary text-brand-on-primary font-semibold hover:bg-brand-hover shadow-md shadow-brand-glow",
  secondary:
    "bg-surface-active text-text-primary font-medium hover:bg-surface-hover active:bg-surface border border-border-subtle",
  glass:
    "bg-glass-frosted text-text-primary font-medium backdrop-blur-xl border border-border-subtle hover:bg-surface-hover hover:border-border-muted shadow-md shadow-black/40 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:bg-gradient-to-r before:from-transparent before:via-white/[0.2] before:to-transparent",
  ghost:
    "bg-transparent text-text-secondary hover:text-text-primary hover:bg-[var(--state-hover)] active:bg-[var(--state-pressed)]",
  outline:
    "border border-border-muted bg-transparent text-text-primary hover:bg-[var(--state-hover)] hover:border-border-focus active:bg-[var(--state-pressed)]",
  danger:
    "bg-status-error text-white font-semibold hover:bg-rose-600 active:bg-rose-700 shadow-md shadow-rose-950/40",
  pill:
    "bg-surface-active text-text-primary font-medium hover:bg-surface-hover active:bg-surface rounded-full",
};

const sizeStyles = {
  xs: "h-7 px-2.5 text-xs rounded-lg gap-1.5",
  sm: "h-9 px-3 text-xs rounded-xl gap-2",
  md: "h-11 px-4 text-sm rounded-xl gap-2.5",
  lg: "h-13 px-5 text-base rounded-2xl gap-3",
  xl: "h-16 px-6 text-lg rounded-full gap-3",
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      children,
      variant = "glass",
      size = "md",
      type = "button",
      isLoading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
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
        className={cn(
          "dying-touch-target relative inline-flex items-center justify-center font-medium transition-all duration-200 select-none cursor-pointer whitespace-nowrap",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          "active:scale-[0.98]",
          variantStyles[variant],
          sizeStyles[size],
          fullWidth && "w-full",
          isDisabled && "cursor-not-allowed opacity-50 active:scale-100",
          className
        )}
        {...props}
      >
        {isLoading ? (
          <>
            <Spinner size={size === "xs" || size === "sm" ? "sm" : "md"} className="mr-2" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="inline-flex shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="inline-flex shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    );
  }
);

Button.displayName = "Button";
