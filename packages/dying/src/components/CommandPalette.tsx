import React, { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { Search } from "lucide-react";
import { cn } from "../utils/cn";

interface CommandContextValue {
  search: string;
  setSearch: (value: string) => void;
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  close: () => void;
}

const CommandContext = createContext<CommandContextValue | null>(null);

function useCommandContext(): CommandContextValue {
  const ctx = useContext(CommandContext);
  if (!ctx) {
    throw new Error("Command components must be used within CommandPalette");
  }
  return ctx;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  label?: string;
  className?: string;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onOpenChange,
  children,
  label = "Command palette",
  className,
}) => {
  const [search, setSearch] = useState("");
  const [activeId, setActiveId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setSearch("");
      setActiveId(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const frame = requestAnimationFrame(() => {
      const items = containerRef.current?.querySelectorAll<HTMLElement>(
        '[data-command-item="true"]:not([data-disabled="true"])'
      );
      if (items && items.length > 0) {
        setActiveId(items[0].id || null);
      } else {
        setActiveId(null);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [search, open]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
      return;
    }

    const items = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>(
        '[data-command-item="true"]:not([data-disabled="true"])'
      ) ?? []
    );
    if (items.length === 0) return;

    const currentIdx = items.findIndex((el) => el.id === activeId);

    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = items[(currentIdx + 1) % items.length];
      setActiveId(next.id);
      next.scrollIntoView({ block: "nearest" });
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prevIdx = currentIdx <= 0 ? items.length - 1 : currentIdx - 1;
      const prev = items[prevIdx];
      setActiveId(prev.id);
      prev.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && currentIdx >= 0) {
      e.preventDefault();
      items[currentIdx].click();
    }
  };

  return (
    <CommandContext.Provider
      value={{
        search,
        setSearch,
        activeId,
        setActiveId,
        close: () => onOpenChange(false),
      }}
    >
      <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <RadixDialog.Content
            ref={containerRef}
            aria-label={label}
            onKeyDown={handleKeyDown}
            className={cn(
              "fixed left-[50%] top-[20%] z-50 w-full max-w-xl translate-x-[-50%] overflow-hidden rounded-2xl border border-border-subtle bg-surface shadow-2xl backdrop-blur-2xl focus-visible:outline-none",
              className
            )}
          >
            <RadixDialog.Title className="sr-only">{label}</RadixDialog.Title>
            {children}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </CommandContext.Provider>
  );
};
CommandPalette.displayName = "CommandPalette";

export interface CommandInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value?: string;
  onValueChange?: (value: string) => void;
}

export const CommandInput = React.forwardRef<HTMLInputElement, CommandInputProps>(
  ({ className, placeholder = "Type a command or search...", value, onValueChange, ...props }, ref) => {
    const ctx = useCommandContext();
    const currentValue = value !== undefined ? value : ctx.search;

    return (
      <div className="flex items-center gap-3 border-b border-border-subtle px-4 py-3">
        <Search className="h-4 w-4 shrink-0 text-text-tertiary" aria-hidden="true" />
        <input
          ref={ref}
          type="text"
          autoFocus
          value={currentValue}
          onChange={(e) => {
            ctx.setSearch(e.target.value);
            onValueChange?.(e.target.value);
          }}
          placeholder={placeholder}
          aria-label={props["aria-label"] ?? placeholder}
          className={cn(
            "w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary focus-visible:outline-none",
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
CommandInput.displayName = "CommandInput";

export type CommandListProps = React.HTMLAttributes<HTMLDivElement>;

export const CommandList = React.forwardRef<HTMLDivElement, CommandListProps>(
  ({ className, ...props }, ref) => (
    <div
      ref={ref}
      role="listbox"
      className={cn("max-h-80 overflow-y-auto p-2", className)}
      {...props}
    />
  )
);
CommandList.displayName = "CommandList";

export interface CommandGroupProps extends React.HTMLAttributes<HTMLDivElement> {
  heading?: string;
}

export const CommandGroup = React.forwardRef<HTMLDivElement, CommandGroupProps>(
  ({ className, heading, children, ...props }, ref) => (
    <div ref={ref} role="group" className={cn("py-1", className)} {...props}>
      {heading && (
        <div className="px-2.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-text-kicker">
          {heading}
        </div>
      )}
      {children}
    </div>
  )
);
CommandGroup.displayName = "CommandGroup";

export interface CommandItemProps
  extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "onSelect"> {
  value?: string;
  keywords?: string[];
  icon?: React.ReactNode;
  shortcut?: string;
  onSelect?: () => void;
}

export const CommandItem = React.forwardRef<HTMLButtonElement, CommandItemProps>(
  (
    { className, value, keywords, icon, shortcut, disabled, onSelect, onClick, children, ...props },
    ref
  ) => {
    const ctx = useCommandContext();
    const id = useId();
    const query = ctx.search.trim().toLowerCase();

    if (query) {
      const text = [
        value ?? "",
        ...(keywords ?? []),
        typeof children === "string" ? children : "",
      ]
        .join(" ")
        .toLowerCase();
      if (!text.includes(query)) return null;
    }

    const isActive = ctx.activeId === id;

    return (
      <button
        ref={ref}
        id={id}
        type="button"
        role="option"
        aria-selected={isActive}
        disabled={disabled}
        data-command-item="true"
        data-disabled={disabled ? "true" : undefined}
        data-active={isActive ? "true" : undefined}
        onMouseEnter={() => {
          if (!disabled) ctx.setActiveId(id);
        }}
        onClick={(e) => {
          onClick?.(e);
          onSelect?.();
          ctx.close();
        }}
        className={cn(
          "dying-touch-target flex w-full items-center justify-between gap-2.5 rounded-lg px-2.5 py-2 text-left text-sm transition-colors cursor-pointer",
          "text-text-secondary hover:bg-[var(--state-hover)] hover:text-text-primary",
          "data-[active=true]:bg-[var(--state-hover)] data-[active=true]:text-text-primary",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        <span className="flex items-center gap-2.5 min-w-0">
          {icon && (
            <span className="shrink-0 text-text-tertiary" aria-hidden="true">
              {icon}
            </span>
          )}
          <span className="truncate">{children}</span>
        </span>
        {shortcut && (
          <kbd className="shrink-0 rounded border border-border-subtle bg-surface-active px-1.5 py-0.5 text-[11px] font-medium text-text-tertiary">
            {shortcut}
          </kbd>
        )}
      </button>
    );
  }
);
CommandItem.displayName = "CommandItem";
