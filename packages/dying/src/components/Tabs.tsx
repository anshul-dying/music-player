import React, { createContext, useContext } from "react";
import { Tabs as RadixTabs } from "radix-ui";
import { cn } from "../utils/cn";

export type TabsVariant = "underline" | "pill";

const TabsVariantContext = createContext<TabsVariant>("underline");

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof RadixTabs.Root> {
  variant?: TabsVariant;
}

export const Tabs = React.forwardRef<React.ElementRef<typeof RadixTabs.Root>, TabsProps>(
  ({ className, variant = "underline", ...props }, ref) => (
    <TabsVariantContext.Provider value={variant}>
      <RadixTabs.Root ref={ref} className={cn("flex flex-col", className)} {...props} />
    </TabsVariantContext.Provider>
  )
);
Tabs.displayName = "Tabs";

export interface TabsListProps extends React.ComponentPropsWithoutRef<typeof RadixTabs.List> {
  variant?: TabsVariant;
}

export const TabsList = React.forwardRef<React.ElementRef<typeof RadixTabs.List>, TabsListProps>(
  ({ className, variant: propVariant, ...props }, ref) => {
    const contextVariant = useContext(TabsVariantContext);
    const variant = propVariant ?? contextVariant;

    return (
      <TabsVariantContext.Provider value={variant}>
        <RadixTabs.List
          ref={ref}
          className={cn(
            "inline-flex items-center",
            variant === "underline"
              ? "gap-4 border-b border-border-subtle"
              : "self-start gap-1 rounded-xl bg-surface p-1 border border-border-subtle",
            className
          )}
          {...props}
        />
      </TabsVariantContext.Provider>
    );
  }
);
TabsList.displayName = "TabsList";

export interface TabsTriggerProps extends React.ComponentPropsWithoutRef<typeof RadixTabs.Trigger> {
  variant?: TabsVariant;
}

export const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Trigger>,
  TabsTriggerProps
>(({ className, variant: propVariant, ...props }, ref) => {
  const contextVariant = useContext(TabsVariantContext);
  const variant = propVariant ?? contextVariant;

  return (
    <RadixTabs.Trigger
      ref={ref}
      className={cn(
        "dying-touch-target inline-flex items-center justify-center whitespace-nowrap text-sm font-medium transition-all select-none cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
        "disabled:pointer-events-none disabled:opacity-50",
        variant === "underline"
          ? "border-b-2 border-transparent px-1 pb-2.5 pt-1 text-text-secondary hover:text-text-primary data-[state=active]:border-brand-primary data-[state=active]:text-text-primary"
          : "rounded-lg px-3 py-1.5 text-text-secondary hover:text-text-primary hover:bg-[var(--state-hover)] data-[state=active]:bg-surface-active data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
        className
      )}
      {...props}
    />
  );
});
TabsTrigger.displayName = "TabsTrigger";

export type TabsContentProps = React.ComponentPropsWithoutRef<typeof RadixTabs.Content>;

export const TabsContent = React.forwardRef<
  React.ElementRef<typeof RadixTabs.Content>,
  TabsContentProps
>(({ className, ...props }, ref) => (
  <RadixTabs.Content
    ref={ref}
    className={cn("mt-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus rounded-lg", className)}
    {...props}
  />
));
TabsContent.displayName = "TabsContent";

export interface SegmentedControlOption<T extends string = string> {
  value: T;
  label: React.ReactNode;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface SegmentedControlProps<T extends string = string> {
  options: SegmentedControlOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  size?: "sm" | "md";
  fullWidth?: boolean;
  className?: string;
  "aria-label"?: string;
}

export function SegmentedControl<T extends string = string>({
  options,
  value,
  onValueChange,
  size = "md",
  fullWidth = false,
  className,
  "aria-label": ariaLabel = "Segmented control",
}: SegmentedControlProps<T>) {
  return (
    <RadixTabs.Root
      value={value}
      onValueChange={(val) => onValueChange(val as T)}
      className={cn(fullWidth ? "flex w-full" : "inline-flex", className)}
    >
      <RadixTabs.List
        aria-label={ariaLabel}
        className={cn(
          "items-center gap-1 rounded-xl border border-border-subtle bg-surface p-1",
          fullWidth ? "flex w-full" : "inline-flex"
        )}
      >
        {options.map((opt) => (
          <RadixTabs.Trigger
            key={opt.value}
            value={opt.value}
            disabled={opt.disabled}
            className={cn(
              "dying-touch-target inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-all select-none cursor-pointer",
              "text-text-secondary hover:text-text-primary hover:bg-[var(--state-hover)]",
              "data-[state=active]:bg-surface-active data-[state=active]:text-text-primary data-[state=active]:shadow-sm",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
              "disabled:pointer-events-none disabled:opacity-50",
              fullWidth && "flex-1",
              size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm"
            )}
          >
            {opt.icon && <span className="shrink-0" aria-hidden="true">{opt.icon}</span>}
            <span>{opt.label}</span>
          </RadixTabs.Trigger>
        ))}
      </RadixTabs.List>
    </RadixTabs.Root>
  );
}

SegmentedControl.displayName = "SegmentedControl";
