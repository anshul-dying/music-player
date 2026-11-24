import React, { createContext, useCallback, useContext, useState } from "react";
import { Toast as RadixToast } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, AlertTriangle, CheckCircle2, X } from "lucide-react";
import { cn } from "../utils/cn";

export type ToastVariant = "default" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
  altText?: string;
}

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number;
  action?: ToastAction;
}

export interface ToastProps extends ToastOptions {
  id: string;
  onDismiss?: (id: string) => void;
}

export interface ToastProviderProps {
  children: React.ReactNode;
  duration?: number;
  swipeDirection?: "right" | "left" | "up" | "down";
}

interface ToastContextValue {
  toast: (options: ToastOptions) => string;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  default: "border-border-subtle bg-surface/95 text-text-primary",
  success: "border-status-success/40 bg-surface/95 text-text-primary",
  warning: "border-status-warning/40 bg-surface/95 text-text-primary",
  error: "border-status-error/40 bg-surface/95 text-text-primary",
};

const variantIcons: Record<ToastVariant, React.ReactNode> = {
  default: null,
  success: <CheckCircle2 className="h-4 w-4 text-status-success shrink-0 mt-0.5" aria-hidden="true" />,
  warning: <AlertTriangle className="h-4 w-4 text-status-warning shrink-0 mt-0.5" aria-hidden="true" />,
  error: <AlertCircle className="h-4 w-4 text-status-error shrink-0 mt-0.5" aria-hidden="true" />,
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  duration = 4500,
  swipeDirection = "right",
}) => {
  const [toasts, setToasts] = useState<ToastProps[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback((options: ToastOptions) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts((prev) => [...prev, { ...options, id }]);
    return id;
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      <RadixToast.Provider duration={duration} swipeDirection={swipeDirection}>
        {children}
        <AnimatePresence mode="popLayout">
          {toasts.map((item) => {
            const variant = item.variant ?? "default";
            return (
              <RadixToast.Root
                key={item.id}
                duration={item.duration ?? duration}
                onOpenChange={(open) => {
                  if (!open) dismiss(item.id);
                }}
                asChild
              >
                <motion.li
                  layout
                  initial={{ opacity: 0, y: 16, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.96 }}
                  transition={{ duration: 0.2 }}
                  className={cn(
                    "pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border p-4 shadow-2xl backdrop-blur-xl",
                    variantStyles[variant]
                  )}
                >
                  {variantIcons[variant]}
                  <div className="flex-1 min-w-0">
                    <RadixToast.Title className="text-sm font-semibold text-text-primary">
                      {item.title}
                    </RadixToast.Title>
                    {item.description && (
                      <RadixToast.Description className="mt-1 text-xs text-text-secondary leading-relaxed">
                        {item.description}
                      </RadixToast.Description>
                    )}
                    {item.action && (
                      <div className="mt-2.5">
                        <RadixToast.Action
                          altText={item.action.altText ?? item.action.label}
                          onClick={item.action.onClick}
                          className="dying-touch-target inline-flex items-center rounded-lg bg-brand-primary px-2.5 py-1 text-xs font-semibold text-brand-on-primary hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                        >
                          {item.action.label}
                        </RadixToast.Action>
                      </div>
                    )}
                  </div>
                  <RadixToast.Close
                    aria-label="Dismiss notification"
                    className="dying-touch-target shrink-0 rounded-lg p-1 text-text-tertiary hover:bg-[var(--state-hover)] hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                  </RadixToast.Close>
                </motion.li>
              </RadixToast.Root>
            );
          })}
        </AnimatePresence>
        <RadixToast.Viewport className="fixed bottom-4 right-4 z-50 flex max-h-screen w-full max-w-sm flex-col gap-2 p-4 outline-none" />
      </RadixToast.Provider>
    </ToastContext.Provider>
  );
};

ToastProvider.displayName = "ToastProvider";

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}
