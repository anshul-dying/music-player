import React from "react";
import { cn } from "../utils/cn";

export interface BottomNavProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * BottomNavItem children.
   */
  children: React.ReactNode;
}

/**
 * BottomNav: Fixed mobile bottom navigation bar (hidden on md+ viewports).
 * Uses elevated acrylic surface, safe-area inset padding, and semantic tokens.
 */
export const BottomNav = React.forwardRef<HTMLElement, BottomNavProps>(
  ({ className, children, "aria-label": ariaLabel = "Primary navigation", ...props }, ref) => {
    return (
      <nav
        ref={ref}
        aria-label={ariaLabel}
        className={cn(
          "fixed bottom-0 inset-x-0 z-40 md:hidden dying-acrylic-elevated border-t border-border-subtle pb-[env(safe-area-inset-bottom)] select-none",
          className
        )}
        {...props}
      >
        <div className="flex h-16 items-center justify-around px-2">
          {children}
        </div>
      </nav>
    );
  }
);

BottomNav.displayName = "BottomNav";

export interface BottomNavItemProps {
  /**
   * Leading icon element.
   */
  icon: React.ReactNode;
  /**
   * Short navigation label.
   */
  label: React.ReactNode;
  /**
   * Whether this navigation item is currently active.
   */
  active?: boolean;
  /**
   * Optional badge or notification indicator.
   */
  badge?: React.ReactNode;
  /**
   * Click handler (used when rendering as a button or alongside href).
   */
  onClick?: () => void;
  /**
   * Optional link destination (renders an anchor when provided and not disabled).
   */
  href?: string;
  /**
   * Disables interaction.
   */
  disabled?: boolean;
  /**
   * Additional class names.
   */
  className?: string;
  /**
   * Accessible label override.
   */
  "aria-label"?: string;
}

/**
 * BottomNavItem: Mobile bottom navigation destination with 44px+ touch target,
 * active --brand-primary indicator, and aria-current="page" support.
 */
export const BottomNavItem: React.FC<BottomNavItemProps> = ({
  icon,
  label,
  active = false,
  badge,
  onClick,
  href,
  disabled = false,
  className,
  "aria-label": ariaLabel,
}) => {
  const content = (
    <>
      {active && (
        <span
          aria-hidden="true"
          className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-brand-primary"
        />
      )}
      <span className="relative flex h-6 w-6 items-center justify-center">
        {icon}
        {badge !== undefined && badge !== null && (
          <span className="absolute -top-1 -right-2 flex min-w-4 h-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-semibold leading-none text-brand-on-primary">
            {badge}
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-[11px] font-medium leading-tight">
        {label}
      </span>
    </>
  );

  const baseClasses = cn(
    "dying-touch-target relative flex min-h-[44px] min-w-[44px] flex-1 max-w-[96px] flex-col items-center justify-center gap-0.5 rounded-xl px-2 py-1 transition-colors duration-150 outline-none select-none cursor-pointer",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
    active
      ? "text-brand-primary"
      : "text-text-secondary hover:bg-[var(--state-hover)] hover:text-text-primary active:bg-[var(--state-pressed)]",
    disabled && "cursor-not-allowed opacity-40 hover:bg-transparent hover:text-text-secondary",
    className
  );

  if (href && !disabled) {
    return (
      <a
        href={href}
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        aria-label={ariaLabel}
        className={baseClasses}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
      className={baseClasses}
    >
      {content}
    </button>
  );
};

BottomNavItem.displayName = "BottomNavItem";
