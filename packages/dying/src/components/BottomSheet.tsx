import React, { useEffect, useState } from "react";
import { Dialog as RadixDialog } from "radix-ui";
import { motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "../utils/cn";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./Overlays";

export const BottomSheet = RadixDialog.Root;
export const BottomSheetTrigger = RadixDialog.Trigger;
export const BottomSheetClose = RadixDialog.Close;

export interface BottomSheetContentProps
  extends React.ComponentPropsWithoutRef<typeof RadixDialog.Content> {
  showCloseButton?: boolean;
  showHandle?: boolean;
}

export const BottomSheetContent = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Content>,
  BottomSheetContentProps
>(({ className, children, showCloseButton = true, showHandle = true, ...props }, ref) => (
  <RadixDialog.Portal>
    <RadixDialog.Overlay className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
    <RadixDialog.Content ref={ref} asChild {...props}>
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 30, stiffness: 320 }}
        className={cn(
          "fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col rounded-t-3xl border-t border-border-subtle bg-surface p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] shadow-2xl focus-visible:outline-none",
          className
        )}
      >
        {showHandle && (
          <div
            aria-hidden="true"
            className="mx-auto mb-4 h-1 w-10 shrink-0 rounded-full bg-border-muted"
          />
        )}
        {showCloseButton && (
          <RadixDialog.Close
            aria-label="Close sheet"
            className="dying-touch-target absolute right-4 top-4 rounded-lg p-1.5 text-text-secondary opacity-70 transition-opacity hover:opacity-100 hover:bg-[var(--state-hover)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </RadixDialog.Close>
        )}
        <div className="overflow-y-auto">{children}</div>
      </motion.div>
    </RadixDialog.Content>
  </RadixDialog.Portal>
));
BottomSheetContent.displayName = "BottomSheetContent";

export const BottomSheetHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-left mb-4", className)} {...props} />
);
BottomSheetHeader.displayName = "BottomSheetHeader";

export const BottomSheetTitle = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Title>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Title>
>(({ className, ...props }, ref) => (
  <RadixDialog.Title
    ref={ref}
    className={cn("text-lg font-bold tracking-tight text-text-primary", className)}
    {...props}
  />
));
BottomSheetTitle.displayName = "BottomSheetTitle";

export const BottomSheetDescription = React.forwardRef<
  React.ElementRef<typeof RadixDialog.Description>,
  React.ComponentPropsWithoutRef<typeof RadixDialog.Description>
>(({ className, ...props }, ref) => (
  <RadixDialog.Description
    ref={ref}
    className={cn("text-sm text-text-secondary leading-relaxed", className)}
    {...props}
  />
));
BottomSheetDescription.displayName = "BottomSheetDescription";

export interface ResponsiveSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const ResponsiveSheet: React.FC<ResponsiveSheetProps> = ({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  className,
}) => {
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  if (isDesktop) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
        <DialogContent className={className}>
          {(title || description) && (
            <DialogHeader>
              {title && <DialogTitle>{title}</DialogTitle>}
              {description && <DialogDescription>{description}</DialogDescription>}
            </DialogHeader>
          )}
          {children}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      {trigger && <BottomSheetTrigger asChild>{trigger}</BottomSheetTrigger>}
      <BottomSheetContent className={className}>
        {(title || description) && (
          <BottomSheetHeader>
            {title && <BottomSheetTitle>{title}</BottomSheetTitle>}
            {description && <BottomSheetDescription>{description}</BottomSheetDescription>}
          </BottomSheetHeader>
        )}
        {children}
      </BottomSheetContent>
    </BottomSheet>
  );
};

ResponsiveSheet.displayName = "ResponsiveSheet";
